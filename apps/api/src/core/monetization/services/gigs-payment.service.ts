import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import Stripe from 'stripe';

interface CreateGigPaymentDto {
  gigId: string;
  artistId: string;
  userId: string; // The person booking the gig
}

interface GigPaymentResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  gig: any;
  escrowDetails: {
    holdUntil: Date;
    autoReleaseAfter: number;
    disputeWindow: number;
  };
}

@Injectable()
export class GigsPaymentService {
  private readonly logger = new Logger(GigsPaymentService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private transactionService: TransactionService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create a payment intent for booking a gig
   * Funds are held in escrow and auto-released after 3 days
   */
  async createGigPayment(dto: CreateGigPaymentDto): Promise<GigPaymentResult> {
    const { gigId, artistId, userId } = dto;

    // Get gig
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      include: {
        artist: { include: { user: true } },
      },
    });

    if (!gig) {
      throw new NotFoundException('Gig not found');
    }

    if (!gig.isAvailable) {
      throw new BadRequestException('This gig is not available for booking');
    }

    // Get users
    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    const artist = await this.prisma.user.findUnique({
      where: { id: artistId },
      include: { wallet: true },
    });

    if (!buyer || !artist) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-booking
    if (userId === artistId) {
      throw new BadRequestException('You cannot book your own gig');
    }

    // Check for existing active booking
    const existingBooking = await this.prisma.gigBooking.findFirst({
      where: {
        gigId,
        userId,
        status: { in: ['confirmed', 'in_progress', 'completed'] },
      },
    });

    if (existingBooking) {
      throw new ConflictException('You already have an active booking for this gig');
    }

    // Calculate pricing
    const amount = Math.round(gig.price * 100); // Convert to cents

    // Create booking record in PENDING state
    const booking = await this.prisma.gigBooking.create({
      data: {
        gigId,
        userId,
        artistId,
        amount,
        status: 'pending',
        bookedAt: new Date(),
      },
    });

    // Create Stripe payment intent with escrow hold
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        type: 'gig_booking',
        gigId,
        bookingId: booking.id,
        buyerId: buyer.id,
        artistId: artist.id,
        artistName: gig.artist.stageName,
      },
      description: `Book gig: ${gig.title} by ${gig.artist.stageName}`,
      // Key: application_fee_percent for Stripe Connect
      // This allows us to take a cut while funds go to artist's account
      application_fee_percent: 15, // 15% platform fee
    });

    this.logger.log(
      `Created payment intent ${paymentIntent.id} for gig booking ${booking.id}`,
    );

    // Calculate escrow dates
    const holdUntil = new Date();
    holdUntil.setDate(holdUntil.getDate() + 3); // Hold for 3 days

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount,
      currency: 'usd',
      gig: {
        id: gig.id,
        title: gig.title,
        artistName: gig.artist.stageName,
        price: gig.price,
        description: gig.description,
        duration: gig.duration,
        category: gig.category,
      },
      escrowDetails: {
        holdUntil,
        autoReleaseAfter: 3, // days
        disputeWindow: 2, // days before auto-release to dispute
      },
    };
  }

  /**
   * Handle successful payment from Stripe webhook
   */
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { bookingId, gigId, artistId } = paymentIntent.metadata as any;

    this.logger.log(
      `Processing successful gig booking payment ${paymentIntent.id} for booking ${bookingId}`,
    );

    // Get booking and gig
    const booking = await this.prisma.gigBooking.findUnique({
      where: { id: bookingId },
      include: {
        gig: { include: { artist: { include: { user: true } } } },
        user: { include: { wallet: true } },
      },
    });

    if (!booking) {
      this.logger.error(`Booking ${bookingId} not found`);
      return;
    }

    const amount = paymentIntent.amount_received; // Amount in cents
    const platformFee = Math.round(amount * 0.15); // 15% to platform
    const artistAmount = amount - platformFee;

    // Update booking status to CONFIRMED
    await this.prisma.gigBooking.update({
      where: { id: bookingId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
        paymentIntentId: paymentIntent.id,
      },
    });

    // Create transaction for buyer
    await this.transactionService.createTransaction({
      walletId: booking.user.wallet!.id,
      type: 'GIG_BOOKING',
      amount: -amount,
      fee: platformFee,
      netAmount: -artistAmount,
      description: `Booked gig: "${booking.gig.title}" with ${booking.gig.artist.stageName}`,
      referenceId: booking.id,
      referenceType: 'GIG_BOOKING',
      stripePaymentIntentId: paymentIntent.id,
      status: 'COMPLETED',
    });

    // Create transaction for artist (funds in escrow, not yet released)
    await this.transactionService.createTransaction({
      walletId: booking.gig.artist.user.wallet!.id,
      type: 'GIG_BOOKING_ESCROW',
      amount: artistAmount,
      fee: 0,
      netAmount: artistAmount,
      description: `Booked: "${booking.gig.title}" (held in escrow, auto-releases in 3 days)`,
      referenceId: booking.id,
      referenceType: 'GIG_BOOKING',
      stripePaymentIntentId: paymentIntent.id,
      status: 'PENDING', // Not released yet
    });

    // Schedule auto-release in 3 days (in production, use a job queue)
    this.scheduleEscrowRelease(booking.id);

    this.logger.log(
      `Confirmed gig booking ${bookingId}: Artist will receive $${(artistAmount / 100).toFixed(2)} after 3 days`,
    );
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { bookingId } = paymentIntent.metadata as any;

    if (!bookingId) return;

    this.logger.error(`Gig booking payment failed: ${bookingId}`);

    // Update booking status to FAILED
    await this.prisma.gigBooking.update({
      where: { id: bookingId },
      data: { status: 'failed' },
    });
  }

  /**
   * Cancel a gig booking (refund buyer, release escrow)
   */
  async cancelBooking(bookingId: string, reason: string) {
    const booking = await this.prisma.gigBooking.findUnique({
      where: { id: bookingId },
      include: { gig: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking already cancelled');
    }

    // Process refund if payment was captured
    if (booking.paymentIntentId) {
      try {
        await this.stripe.refunds.create({
          payment_intent: booking.paymentIntentId,
          reason: 'requested_by_customer',
        });

        this.logger.log(`Refunded payment for booking ${bookingId}`);
      } catch (error) {
        this.logger.error(`Failed to refund payment for booking ${bookingId}: ${error.message}`);
      }
    }

    // Update booking status
    await this.prisma.gigBooking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    this.logger.log(`Cancelled gig booking ${bookingId}: ${reason}`);
  }

  /**
   * Release escrow funds to artist (after 3 day hold)
   */
  async releaseEscrow(bookingId: string) {
    const booking = await this.prisma.gigBooking.findUnique({
      where: { id: bookingId },
      include: {
        gig: { include: { artist: { include: { user: true } } } },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== 'confirmed') {
      throw new BadRequestException('Only confirmed bookings can release escrow');
    }

    const amount = booking.amount;

    // Add to artist's wallet
    await this.walletService.addToWallet(booking.artistId, amount);

    // Update transaction status
    await this.prisma.transaction.updateMany({
      where: {
        referenceId: bookingId,
        type: 'GIG_BOOKING_ESCROW',
      },
      data: { status: 'COMPLETED' },
    });

    // Mark booking as completed
    await this.prisma.gigBooking.update({
      where: { id: bookingId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Released escrow for booking ${bookingId}: Artist received $${(amount / 100).toFixed(2)}`,
    );
  }

  /**
   * Create a dispute for a booking
   */
  async createDispute(bookingId: string, reason: string, userId: string) {
    const booking = await this.prisma.gigBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only buyer or artist can dispute
    if (userId !== booking.userId && userId !== booking.artistId) {
      throw new BadRequestException('Not authorized to dispute this booking');
    }

    // Can only dispute confirmed bookings within dispute window
    if (booking.status !== 'confirmed') {
      throw new BadRequestException('Can only dispute confirmed bookings');
    }

    const confirmedDate = booking.confirmedAt!;
    const now = new Date();
    const daysSinceConfirmed = (now.getTime() - confirmedDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceConfirmed > 2) {
      throw new BadRequestException('Dispute window has closed (24 hours before auto-release)');
    }

    // Create dispute record
    const dispute = await this.prisma.gigDispute.create({
      data: {
        bookingId,
        initiatedBy: userId,
        reason,
        status: 'open',
      },
    });

    this.logger.log(`Created dispute ${dispute.id} for booking ${bookingId}`);

    return dispute;
  }

  /**
   * Resolve dispute (admin operation)
   */
  async resolveDispute(
    disputeId: string,
    resolution: 'refund' | 'release',
    notes: string,
  ) {
    const dispute = await this.prisma.gigDispute.findUnique({
      where: { id: disputeId },
      include: { booking: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (resolution === 'refund') {
      await this.cancelBooking(dispute.bookingId, `Dispute resolution: ${notes}`);
    } else if (resolution === 'release') {
      await this.releaseEscrow(dispute.bookingId);
    }

    // Update dispute status
    await this.prisma.gigDispute.update({
      where: { id: disputeId },
      data: {
        status: 'resolved',
        resolution,
        resolvedAt: new Date(),
        notes,
      },
    });

    this.logger.log(`Resolved dispute ${disputeId}: ${resolution}`);
  }

  /**
   * Schedule escrow release (use job queue in production)
   */
  private scheduleEscrowRelease(bookingId: string) {
    const delayMs = 3 * 24 * 60 * 60 * 1000; // 3 days

    setTimeout(async () => {
      try {
        await this.releaseEscrow(bookingId);
      } catch (error) {
        this.logger.error(`Failed to auto-release escrow for booking ${bookingId}: ${error.message}`);
      }
    }, delayMs);
  }

  /**
   * Get booking details
   */
  async getBookingDetails(bookingId: string) {
    return this.prisma.gigBooking.findUnique({
      where: { id: bookingId },
      include: {
        gig: { include: { artist: { include: { user: true } } } },
        user: true,
      },
    });
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string, limit = 50) {
    return this.prisma.gigBooking.findMany({
      where: { userId },
      include: {
        gig: { include: { artist: { include: { user: true } } } },
      },
      orderBy: { bookedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get artist's bookings
   */
  async getArtistBookings(artistId: string, limit = 50) {
    return this.prisma.gigBooking.findMany({
      where: { artistId },
      include: {
        gig: true,
        user: true,
      },
      orderBy: { bookedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get pending escrow releases (admin view)
   */
  async getPendingEscrow() {
    return this.prisma.gigBooking.findMany({
      where: { status: 'confirmed' },
      include: {
        gig: { include: { artist: { include: { user: true } } } },
        user: true,
      },
      orderBy: { confirmedAt: 'asc' },
    });
  }
}
