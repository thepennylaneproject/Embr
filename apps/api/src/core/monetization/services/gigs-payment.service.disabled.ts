/*
DISABLED: Gigs Payment Service - Preserved for future implementation

This service was written for a different Gig model schema and references non-existent
Prisma models (GigBooking) and properties (price, duration, isAvailable, artist).
Re-enable this when the corresponding Prisma schema models are implemented.

---

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

  async createGigPayment(dto: CreateGigPaymentDto): Promise<GigPaymentResult> {
    const { gigId, artistId, userId } = dto;
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
    if (userId === artistId) {
      throw new BadRequestException('You cannot book your own gig');
    }
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
    const amount = Math.round(gig.price * 100);
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
      application_fee_percent: 15,
    });
    this.logger.log(
      `Created payment intent ${paymentIntent.id} for gig booking ${booking.id}`,
    );
    const holdUntil = new Date();
    holdUntil.setDate(holdUntil.getDate() + 3);
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
        autoReleaseAfter: 3,
        disputeWindow: 2,
      },
    };
  }

  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { bookingId, gigId, artistId } = paymentIntent.metadata as any;
    this.logger.log(
      `Processing successful gig booking payment ${paymentIntent.id} for booking ${bookingId}`,
    );
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
    const amount = paymentIntent.amount_received;
    const platformFee = Math.round(amount * 0.15);
    const artistAmount = amount - platformFee;
    await this.prisma.gigBooking.update({
      where: { id: bookingId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
        paymentIntentId: paymentIntent.id,
      },
    });
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
      status: 'PENDING',
    });
    this.scheduleEscrowRelease(booking.id);
    this.logger.log(
      `Confirmed gig booking ${bookingId}: Artist will receive $${(artistAmount / 100).toFixed(2)} after 3 days`,
    );
  }

  async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { bookingId } = paymentIntent.metadata as any;
    if (!bookingId) return;
    this.logger.error(`Gig booking payment failed: ${bookingId}`);
    await this.prisma.gigBooking.update({
      where: { id: bookingId },
      data: { status: 'failed' },
    });
  }

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
    await this.prisma.gigBooking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });
    this.logger.log(`Cancelled gig booking ${bookingId}: ${reason}`);
  }

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
    await this.walletService.addToWallet(booking.artistId, amount);
    await this.prisma.transaction.updateMany({
      where: {
        referenceId: bookingId,
        type: 'GIG_BOOKING_ESCROW',
      },
      data: { status: 'COMPLETED' },
    });
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

  async createDispute(bookingId: string, reason: string, userId: string) {
    const booking = await this.prisma.gigBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (userId !== booking.userId && userId !== booking.artistId) {
      throw new BadRequestException('Not authorized to dispute this booking');
    }
    if (booking.status !== 'confirmed') {
      throw new BadRequestException('Can only dispute confirmed bookings');
    }
    const confirmedDate = booking.confirmedAt!;
    const now = new Date();
    const daysSinceConfirmed = (now.getTime() - confirmedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceConfirmed > 2) {
      throw new BadRequestException('Dispute window has closed (24 hours before auto-release)');
    }
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

  private scheduleEscrowRelease(bookingId: string) {
    const delayMs = 3 * 24 * 60 * 60 * 1000;
    setTimeout(async () => {
      try {
        await this.releaseEscrow(bookingId);
      } catch (error) {
        this.logger.error(`Failed to auto-release escrow for booking ${bookingId}: ${error.message}`);
      }
    }, delayMs);
  }

  async getBookingDetails(bookingId: string) {
    return this.prisma.gigBooking.findUnique({
      where: { id: bookingId },
      include: {
        gig: { include: { artist: { include: { user: true } } } },
        user: true,
      },
    });
  }

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

*/
