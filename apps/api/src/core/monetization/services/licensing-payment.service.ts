import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import Stripe from 'stripe';

interface CreateLicensePaymentDto {
  trackId: string;
  creatorId: string;
  userId: string; // The person licensing the music
}

interface LicensePaymentResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  track: any;
}

@Injectable()
export class LicensingPaymentService {
  private readonly logger = new Logger(LicensingPaymentService.name);
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
   * Create a payment intent for music licensing
   * Returns clientSecret for frontend to complete payment
   */
  async createLicensePayment(
    dto: CreateLicensePaymentDto,
  ): Promise<LicensePaymentResult> {
    const { trackId, creatorId, userId } = dto;

    // Get track
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: { artist: { include: { user: true } } },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    if (!track.isPublished) {
      throw new BadRequestException('Track is not published');
    }

    // Check licensing
    if (track.licensingModel === 'restricted') {
      throw new BadRequestException('This track is not available for licensing');
    }

    // Get users
    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: { wallet: true },
    });

    if (!buyer || !creator) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-licensing
    if (userId === creatorId) {
      throw new BadRequestException('You cannot license your own music');
    }

    // Calculate pricing
    const amount = Math.round(track.price * 100); // Convert to cents

    if (amount === 0) {
      // Free track - just record usage, no payment needed
      return this.handleFreeTrackUsage(track, buyer.id, creator.id);
    }

    // Create Stripe payment intent for music licensing
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        type: 'music_license',
        trackId,
        buyerId: buyer.id,
        creatorId: creator.id,
        stageName: track.artist.stageName,
      },
      description: `License: ${track.title} by ${track.artist.stageName}`,
    });

    this.logger.log(
      `Created payment intent ${paymentIntent.id} for track ${trackId}`,
    );

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret!,
      amount,
      currency: 'usd',
      track: {
        id: track.id,
        title: track.title,
        artistName: track.artist.stageName,
        price: track.price,
        licensingModel: track.licensingModel,
        allowMonetize: track.allowMonetize,
        attributionRequired: track.attributionRequired,
        audioUrl: track.audioUrl,
      },
    };
  }

  /**
   * Handle free track usage
   */
  private async handleFreeTrackUsage(
    track: any,
    buyerId: string,
    creatorId: string,
  ): Promise<LicensePaymentResult> {
    // Record VideoUsage for free track
    await this.prisma.videoUsage.create({
      data: {
        trackId: track.id,
        contentType: 'license',
        contentId: `free-${Date.now()}`,
        creatorId: buyerId,
        licensingModel: track.licensingModel,
        allowMonetize: track.allowMonetize,
        attributionUrl: `/music/artist/${track.artist.id}`,
        isAttributed: track.attributionRequired,
      },
    });

    // Increment track usage count
    await this.prisma.track.update({
      where: { id: track.id },
      data: { usedInCount: { increment: 1 } },
    });

    return {
      paymentIntentId: 'free',
      clientSecret: 'free',
      amount: 0,
      currency: 'usd',
      track: {
        id: track.id,
        title: track.title,
        artistName: track.artist.stageName,
        price: 0,
        licensingModel: track.licensingModel,
        allowMonetize: track.allowMonetize,
        attributionRequired: track.attributionRequired,
        audioUrl: track.audioUrl,
      },
    };
  }

  /**
   * Handle successful payment from Stripe webhook
   */
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { trackId, buyerId, creatorId } = paymentIntent.metadata as any;

    this.logger.log(
      `Processing successful payment ${paymentIntent.id} for track ${trackId}`,
    );

    // Get track
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: { artist: { include: { user: true } } },
    });

    if (!track) {
      this.logger.error(`Track ${trackId} not found`);
      return;
    }

    // Calculate splits
    const amount = paymentIntent.amount_received; // Amount in cents
    const platformFee = Math.round(amount * 0.15); // 15% to platform
    const artistAmount = amount - platformFee;

    // Create transaction for buyer (record the purchase)
    const buyerTransaction = await this.transactionService.createTransaction({
      walletId: (await this.prisma.user.findUnique({ where: { id: buyerId }, include: { wallet: true } }))!.wallet!.id,
      type: 'MUSIC_LICENSE',
      amount: -amount, // Negative for buyer (spent money)
      fee: platformFee,
      netAmount: -artistAmount,
      description: `Purchased license for "${track.title}" by ${track.artist.stageName}`,
      referenceId: trackId,
      referenceType: 'TRACK',
      stripePaymentIntentId: paymentIntent.id,
      status: 'COMPLETED',
    });

    // Add to artist's wallet balance
    await this.walletService.addToWallet(creatorId, artistAmount);

    // Create transaction for artist (record the earnings)
    const artistTransaction = await this.transactionService.createTransaction({
      walletId: (await this.prisma.user.findUnique({ where: { id: creatorId }, include: { wallet: true } }))!.wallet!.id,
      type: 'MUSIC_LICENSE_EARNED',
      amount: artistAmount,
      fee: 0,
      netAmount: artistAmount,
      description: `Earned from selling license for "${track.title}"`,
      referenceId: trackId,
      referenceType: 'TRACK',
      stripePaymentIntentId: paymentIntent.id,
      status: 'COMPLETED',
    });

    // Record VideoUsage
    await this.prisma.videoUsage.create({
      data: {
        trackId,
        contentType: 'license',
        contentId: paymentIntent.id,
        creatorId: buyerId,
        licensingModel: track.licensingModel,
        allowMonetize: track.allowMonetize,
        attributionUrl: `/music/artist/${track.artist.id}`,
        isAttributed: track.attributionRequired,
        totalRevenue: amount,
        originalArtistShare: artistAmount,
        creatorShare: 0, // Buyer doesn't earn from license purchase itself
        platformShare: platformFee,
      },
    });

    // Increment track usage count
    await this.prisma.track.update({
      where: { id: trackId },
      data: { usedInCount: { increment: 1 } },
    });

    this.logger.log(
      `Processed payment ${paymentIntent.id}: Artist earned $${(artistAmount / 100).toFixed(2)}`,
    );
  }

  /**
   * Get licensing history for a creator
   */
  async getCreatorLicenses(creatorId: string, limit = 50) {
    return this.prisma.videoUsage.findMany({
      where: { creatorId, contentType: 'license' },
      include: {
        track: {
          include: {
            artist: { include: { user: true } },
          },
        },
      },
      orderBy: { usageDate: 'desc' },
      take: limit,
    });
  }

  /**
   * Get artist licensing earnings
   */
  async getArtistLicensingEarnings(artistId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usages = await this.prisma.videoUsage.findMany({
      where: {
        track: { artistId },
        contentType: 'license',
        usageDate: { gte: startDate },
      },
      include: { track: true },
    });

    const totalRevenue = usages.reduce((sum, usage) => sum + usage.originalArtistShare, 0);
    const totalUsages = usages.length;
    const averagePerLicense = totalUsages > 0 ? totalRevenue / totalUsages : 0;

    return {
      totalRevenue,
      totalUsages,
      averagePerLicense,
      period: `${days} days`,
      usages,
    };
  }
}
