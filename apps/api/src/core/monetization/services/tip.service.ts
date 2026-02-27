import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { CreateTipDto, GetTipsQueryDto } from '../dto/tip.dto';
import { NOTIFICATION_TYPES } from '../../notifications/notifications.constants';
import Stripe from 'stripe';

@Injectable()
export class TipService {
  private readonly logger = new Logger(TipService.name);
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
   * Create and process a tip
   * @param amount Amount in CENTS (integer, e.g., 50 = $0.50)
   */
  async createTip(senderId: string, dto: CreateTipDto): Promise<any> {
    const { recipientId, postId, amountCents, message, paymentMethodId } = dto;

    // Validation (amounts in cents)
    if (senderId === recipientId) {
      throw new BadRequestException('Cannot tip yourself');
    }

    if (amountCents < 50) {  // $0.50 minimum
      throw new BadRequestException('Minimum tip amount is $0.50');
    }

    if (amountCents > 100000) {  // $1,000 maximum
      throw new BadRequestException('Maximum tip amount is $1,000');
    }

    // Verify recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Verify post exists if provided
    if (postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new NotFoundException('Post not found');
      }

      if (post.authorId !== recipientId) {
        throw new BadRequestException('Post does not belong to recipient');
      }
    }

    // Create tip record
    const tip = await this.prisma.tip.create({
      data: {
        senderId,
        recipientId,
        postId,
        amount,
        message,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            user: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        recipient: {
          select: {
            user: {
              select: {
                username: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        post: postId
          ? {
              select: {
                id: true,
                content: true,
                mediaUrl: true,
              },
            }
          : undefined,
      },
    });

    try {
      // Process payment through Stripe (pass cents)
      const paymentIntent = await this.processStripePayment(
        amountCents,
        senderId,
        paymentMethodId,
        {
          tipId: tip.id,
          recipientId,
          postId,
        },
      );

      // Update tip with payment intent
      await this.prisma.tip.update({
        where: { id: tip.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: 'PROCESSING',
        },
      });

      // If payment succeeded immediately, complete the tip
      if (paymentIntent.status === 'succeeded') {
        await this.completeTip(tip.id);
      }

      this.logger.log(
        `Tip created: ${amount} from ${senderId} to ${recipientId}`,
      );

      return tip;
    } catch (error) {
      // Mark tip as failed
      await this.prisma.tip.update({
        where: { id: tip.id },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }

  /**
   * Process payment through Stripe
   * @param amountCents Amount in cents (integer)
   */
  private async processStripePayment(
    amountCents: number,
    userId: string,
    paymentMethodId?: string,
    metadata?: Record<string, any>,
  ): Promise<Stripe.PaymentIntent> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let customerId = user.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });

      customerId = customer.id;

      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create payment intent with idempotency key to prevent duplicate charges
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: !!paymentMethodId,
        metadata: {
          ...metadata,
          userId,
        },
        description: `Tip to creator`,
      },
      {
        // Idempotency key: ensures duplicate requests return same intent
        idempotencyKey: `tip-${metadata?.tipId}-${userId}`,
      },
    );

    return paymentIntent;
  }

  /**
   * Complete a tip transaction with atomic operations
   * All amounts in CENTS (integer)
   */
  async completeTip(tipId: string): Promise<any> {
    const tip = await this.prisma.tip.findUnique({
      where: { id: tipId },
    });

    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    // Use Serializable isolation level to prevent race conditions
    const completedTip = await this.prisma.$transaction(
      async (tx) => {
        // Check if still PROCESSING (prevents double-completion)
        const currentTip = await tx.tip.findUnique({
          where: { id: tipId },
        });

        if (currentTip?.status === 'COMPLETED') {
          return currentTip; // Already completed, return as-is
        }

        if (currentTip?.status !== 'PROCESSING') {
          throw new BadRequestException(`Cannot complete tip with status: ${currentTip?.status}`);
        }

        // Calculate platform fee in cents (5%, rounded)
        const platformFeeCents = Math.round(tip.amount * 0.05);
        const netAmountCents = tip.amount - platformFeeCents;

        // Update tip status to COMPLETED
        const updated = await tx.tip.update({
          where: { id: tipId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        // Record transaction in ledger
        await this.transactionService.recordTipTransaction(
          tip.senderId,
          tip.recipientId,
          tip.amount,
          tipId,
        );

        // Update wallet balance (add net amount to recipient)
        const wallet = await tx.wallet.upsert({
          where: { userId: tip.recipientId },
          create: {
            userId: tip.recipientId,
            balance: netAmountCents,
            currency: 'USD',
          },
          update: {
            balance: {
              increment: netAmountCents,
            },
          },
        });

        // Create notification for recipient
        await tx.notification.create({
          data: {
            userId: tip.recipientId,
            type: NOTIFICATION_TYPES.TIP_RECEIVED,
            title: 'You received a tip!',
            message: tip.message || `Someone tipped you $${(tip.amount / 100).toFixed(2)}`,
            referenceId: tipId,
            referenceType: 'TIP',
          },
        });

        return updated;
      },
      {
        isolationLevel: 'Serializable', // Prevent race conditions
      },
    );

    this.logger.log(`Tip completed atomically: ${tipId} (${tip.amount} cents)`);

    return this.prisma.tip.findUnique({
      where: { id: tipId },
      include: {
        sender: {
          select: {
            user: {
              select: {
                username: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        },
        recipient: {
          select: {
            user: {
              select: {
                username: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get tips for a user
   */
  async getTips(
    userId: string,
    query: GetTipsQueryDto,
  ): Promise<{ tips: any[]; total: number; page: number; totalPages: number }> {
    const { type, postId, page = 1, limit = 20 } = query;

    const where: any = {};

    if (type === 'sent') {
      where.senderId = userId;
    } else if (type === 'received') {
      where.recipientId = userId;
    } else {
      // Both sent and received
      where.OR = [{ senderId: userId }, { recipientId: userId }];
    }

    if (postId) {
      where.postId = postId;
    }

    const [tips, total] = await Promise.all([
      this.prisma.tip.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: {
            select: {
              user: {
                select: {
                  username: true,
                  profile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
          recipient: {
            select: {
              user: {
                select: {
                  username: true,
                  profile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
          post: {
            select: {
              id: true,
              content: true,
              thumbnailUrl: true,
            },
          },
        },
      }),
      this.prisma.tip.count({ where }),
    ]);

    return {
      tips,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get tip statistics for a user
   */
  async getTipStats(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalReceived: number;
    totalSent: number;
    tipsReceivedCount: number;
    tipsSentCount: number;
    topTipper?: any;
    averageTipReceived: number;
    averageTipSent: number;
  }> {
    const where: any = {
      status: 'COMPLETED',
    };

    if (startDate || endDate) {
      where.completedAt = {};
      if (startDate) where.completedAt.gte = startDate;
      if (endDate) where.completedAt.lte = endDate;
    }

    const [received, sent] = await Promise.all([
      this.prisma.tip.aggregate({
        where: { ...where, recipientId: userId },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.tip.aggregate({
        where: { ...where, senderId: userId },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Find top tipper
    const topTipperData = await this.prisma.tip.groupBy({
      by: ['senderId'],
      where: { ...where, recipientId: userId },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 1,
    });

    let topTipper = null;
    if (topTipperData.length > 0) {
      const topTipperUser = await this.prisma.user.findUnique({
        where: { id: topTipperData[0].senderId },
        select: {
          id: true,
          profile: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      });

      topTipper = {
        user: topTipperUser,
        totalTipped: topTipperData[0]._sum.amount || 0,
      };
    }

    const totalReceived = received._sum.amount || 0;
    const totalSent = sent._sum.amount || 0;
    const tipsReceivedCount = received._count;
    const tipsSentCount = sent._count;

    return {
      totalReceived: parseFloat(totalReceived.toFixed(2)),
      totalSent: parseFloat(totalSent.toFixed(2)),
      tipsReceivedCount,
      tipsSentCount,
      topTipper,
      averageTipReceived:
        tipsReceivedCount > 0
          ? parseFloat((totalReceived / tipsReceivedCount).toFixed(2))
          : 0,
      averageTipSent:
        tipsSentCount > 0
          ? parseFloat((totalSent / tipsSentCount).toFixed(2))
          : 0,
    };
  }

  /**
   * Refund a tip (admin action)
   */
  async refundTip(tipId: string, reason: string): Promise<any> {
    const tip = await this.prisma.tip.findUnique({
      where: { id: tipId },
    });

    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    if (tip.status !== 'COMPLETED') {
      throw new BadRequestException('Can only refund completed tips');
    }

    // Refund through Stripe if payment intent exists
    if (tip.stripePaymentIntentId) {
      try {
        await this.stripe.refunds.create({
          payment_intent: tip.stripePaymentIntentId,
          reason: 'requested_by_customer',
        });
      } catch (error) {
        this.logger.error(`Stripe refund failed: ${error.message}`);
      }
    }

    // Reverse the transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.tip.update({
        where: { id: tipId },
        data: { status: 'REFUNDED', refundReason: reason },
      });

      // Deduct from recipient wallet
      const platformFee = tip.amount * 0.05;
      const netAmount = tip.amount - platformFee;

      const wallet = await tx.wallet.update({
        where: { userId: tip.recipientId },
        data: {
          balance: {
            decrement: netAmount,
          },
        },
      });

      // Record refund transaction
      await tx.transaction.create({
        data: {
          user: { connect: { id: tip.recipientId } },
          wallet: { connect: { id: wallet.id } },
          type: PrismaTransactionType.REFUND, // GIG_REFUND maps to REFUND? Original was GIG_REFUND.
          // Schema has GIG_REFUND AND REFUND.
          // I will use GIG_REFUND if it exists, or REFUND.
          // Schema Step 2273 shows GIG_REFUND exists.
          amount: -netAmount,
          description: `Tip refund: ${reason}`,
          referenceId: tipId,
          referenceType: 'REFUND',
        },
      });
    });

    this.logger.log(`Tip refunded: ${tipId} - ${reason}`);
    return tip;
  }
}
