import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import {
  CreatePayoutRequestDto,
  ApprovePayoutDto,
  GetPayoutsQueryDto,
  PayoutStatus,
} from '../dto/payout.dto';
import { PayoutStatus as PrismaPayoutStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
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
   * Create a payout request
   */
  async createPayoutRequest(
    userId: string,
    dto: CreatePayoutRequestDto,
  ): Promise<any> {
    const { amount, note } = dto;

    // Validate minimum payout amount
    if (amount < 10) {
      throw new BadRequestException('Minimum payout amount is $10');
    }

    // Check if user has Stripe Connect account
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.wallet?.stripeConnectAccountId) {
      throw new BadRequestException(
        'Please complete Stripe Connect onboarding first',
      );
    }

    if (!user.wallet.payoutsEnabled) {
      throw new BadRequestException(
        'Your account is not yet enabled for payouts',
      );
    }

    // Check available balance
    const balance = await this.walletService.getWalletBalance(userId);
    if (balance.available < amount) {
      throw new BadRequestException(
        `Insufficient balance. Available: $${balance.available.toFixed(2)}`,
      );
    }

    // Check for pending payouts
    const pendingPayout = await this.prisma.payout.findFirst({
      where: {
        userId,
        status: {
          in: [
            PrismaPayoutStatus.PENDING,
            PrismaPayoutStatus.APPROVED,
            PrismaPayoutStatus.PROCESSING,
          ],
        },
      },
    });

    if (pendingPayout) {
      throw new BadRequestException(
        'You already have a pending payout request',
      );
    }

    // Create payout request
    const payout = await this.prisma.payout.create({
      data: {
        user: { connect: { id: userId } },
        wallet: { connect: { userId } },
        amount,
        note,
        status: PrismaPayoutStatus.PENDING,
        currency: 'USD',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Payout request created: ${payout.id} for $${amount}`);

    // Create notification for admins
    await this.createAdminNotification(
      'PAYOUT_REQUESTED',
      `New payout request from ${user.profile?.displayName || user.email}: $${amount}`,
      payout.id,
    );

    return payout;
  }

  /**
   * Approve or reject a payout request (admin action)
   */
  async approvePayout(adminId: string, dto: ApprovePayoutDto): Promise<any> {
    const { payoutRequestId, approve, rejectionReason } = dto;

    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutRequestId },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout request not found');
    }

    if (payout.status !== PrismaPayoutStatus.PENDING) {
      throw new BadRequestException(
        `Cannot process payout with status: ${payout.status}`,
      );
    }

    if (approve) {
      // Approve and process payout
      await this.prisma.payout.update({
        where: { id: payoutRequestId },
        data: {
          status: PrismaPayoutStatus.APPROVED,
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      });

      // Initiate Stripe payout
      try {
        await this.processStripePayout(payoutRequestId);
      } catch (error) {
        this.logger.error(`Stripe payout failed: ${error.message}`);
        await this.prisma.payout.update({
          where: { id: payoutRequestId },
          data: {
            status: PrismaPayoutStatus.FAILED,
            failureReason: error.message,
          },
        });
        throw error;
      }
    } else {
      // Reject payout
      await this.prisma.payout.update({
        where: { id: payoutRequestId },
        data: {
          status: PrismaPayoutStatus.REJECTED,
          rejectedBy: adminId,
          rejectedAt: new Date(),
          rejectionReason,
        },
      });

      // Notify user
      await this.prisma.notification.create({
        data: {
          userId: payout.userId,
          type: 'PAYOUT_REJECTED',
          title: 'Payout request rejected',
          message: rejectionReason || 'Your payout request was not approved',
          referenceId: payoutRequestId,
          referenceType: 'PAYOUT',
        },
      });

      this.logger.log(`Payout rejected: ${payoutRequestId}`);
    }

    return this.prisma.payout.findUnique({
      where: { id: payoutRequestId },
    });
  }

  /**
   * Process payout through Stripe Connect
   */
  private async processStripePayout(payoutId: string): Promise<void> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        user: {
          include: {
            wallet: true,
            profile: true,
          },
        },
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    const stripeAccountId = payout.user.wallet?.stripeConnectAccountId;
    if (!stripeAccountId) {
      throw new BadRequestException('No Stripe Connect account found');
    }

    // Update status to processing
    await this.prisma.payout.update({
      where: { id: payoutId },
      data: { status: PrismaPayoutStatus.PROCESSING },
    });

    try {
      // Convert to cents
      const amountInCents = Math.round(payout.amount * 100);

      // Create Stripe payout
      const stripePayout = await this.stripe.payouts.create(
        {
          amount: amountInCents,
          currency: payout.currency.toLowerCase(),
          description: `Payout for ${payout.user.profile?.username || payout.user.email}`,
          metadata: {
            payoutId: payout.id,
            userId: payout.userId,
          },
        },
        {
          stripeAccount: stripeAccountId,
        },
      );

      // Update payout with Stripe payout ID
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          stripePayoutId: stripePayout.id,
          status: PrismaPayoutStatus.PROCESSING,
          processedAt: new Date(),
        },
      });

      // Deduct from wallet
      await this.walletService.deductFunds(
        payout.userId,
        payout.amount,
        `Payout to bank account`,
      );

      // Record transaction
      await this.transactionService.recordPayoutTransaction(
        payout.userId,
        payout.amount,
        payoutId,
      );

      // Notify user
      await this.prisma.notification.create({
        data: {
          userId: payout.userId,
          type: 'PAYOUT_PROCESSING',
          title: 'Payout is processing',
          message: `Your payout of $${payout.amount.toFixed(2)} is being processed`,
          referenceId: payoutId,
          referenceType: 'PAYOUT',
        },
      });

      this.logger.log(
        `Stripe payout initiated: ${stripePayout.id} for payout ${payoutId}`,
      );
    } catch (error) {
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: 'FAILED',
          failureReason: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Complete payout (called by Stripe webhook)
   */
  async completePayout(stripePayoutId: string): Promise<any> {
    const payout = await this.prisma.payout.findFirst({
      where: { stripePayoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    await this.prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Notify user
    await this.prisma.notification.create({
      data: {
        userId: payout.userId,
        type: 'PAYOUT_COMPLETED',
        title: 'Payout completed',
        message: `Your payout of $${payout.amount.toFixed(2)} has been sent to your bank`,
        referenceId: payout.id,
        referenceType: 'PAYOUT',
      },
    });

    this.logger.log(`Payout completed: ${payout.id}`);
    return payout;
  }

  /**
   * Get payouts for a user
   */
  async getPayouts(
    userId: string,
    query: GetPayoutsQueryDto,
  ): Promise<{ payouts: any[]; total: number; page: number; totalPages: number }> {
    const { status, page = 1, limit = 20 } = query;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  username: true,
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return {
      payouts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all pending payouts (admin)
   */
  async getPendingPayouts(): Promise<any[]> {
    return this.prisma.payout.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get payout statistics
   */
  async getPayoutStats(userId: string): Promise<{
    totalPayouts: number;
    totalAmount: number;
    pendingAmount: number;
    lastPayoutDate?: Date;
  }> {
    const [completed, pending] = await Promise.all([
      this.prisma.payout.aggregate({
        where: {
          userId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payout.aggregate({
        where: {
          userId,
          status: {
            in: ['PENDING', 'APPROVED', 'PROCESSING'],
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const lastPayout = await this.prisma.payout.findFirst({
      where: {
        userId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    });

    return {
      totalPayouts: completed._count,
      totalAmount: parseFloat((completed._sum.amount || 0).toFixed(2)),
      pendingAmount: parseFloat((pending._sum.amount || 0).toFixed(2)),
      lastPayoutDate: lastPayout?.completedAt,
    };
  }

  /**
   * Create admin notification
   */
  private async createAdminNotification(
    type: string,
    message: string,
    referenceId: string,
  ): Promise<void> {
    // Get admin users
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    // Create notification for each admin
    await Promise.all(
      admins.map((admin) =>
        this.prisma.notification.create({
          data: {
            userId: admin.id,
            type,
            title: 'Admin Action Required',
            message,
            referenceId,
            referenceType: 'PAYOUT',
          },
        }),
      ),
    );
  }
}
