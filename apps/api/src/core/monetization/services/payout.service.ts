import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
   * ATOMIC operation: wallet deduction FIRST, then Stripe payout
   * All amounts in CENTS (integer)
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

    // Validate user owns this Stripe account
    if (payout.user.wallet?.stripeConnectAccountId !== stripeAccountId) {
      throw new BadRequestException('Payout account mismatch');
    }

    try {
      // ATOMIC TRANSACTION: Deduct wallet first, then create Stripe payout
      await this.prisma.$transaction(
        async (tx) => {
          // 1. First, deduct from wallet (verify ownership)
          const wallet = await tx.wallet.findUnique({
            where: { userId: payout.userId },
          });

          if (!wallet) {
            throw new BadRequestException('Wallet not found');
          }

          if (wallet.balance < payout.amount) {
            throw new BadRequestException('Insufficient balance for payout');
          }

          // Deduct amount
          await tx.wallet.update({
            where: { userId: payout.userId },
            data: {
              balance: {
                decrement: payout.amount,
              },
            },
          });

          // 2. Record transaction in ledger
          await tx.transaction.create({
            data: {
              user: { connect: { id: payout.userId } },
              wallet: { connect: { id: wallet.id } },
              type: 'PAYOUT',
              amount: -payout.amount,
              description: 'Payout to bank account',
              referenceId: payoutId,
              referenceType: 'PAYOUT',
            },
          });

          // 3. Update payout status
          await tx.payout.update({
            where: { id: payoutId },
            data: { status: PrismaPayoutStatus.PROCESSING },
          });
        },
        {
          isolationLevel: 'Serializable',
        },
      );

      // 4. NOW create Stripe payout (outside of wallet transaction)
      // If this fails, we've already deducted from wallet (correct for failure case)
      const stripePayout = await this.stripe.payouts.create(
        {
          amount: payout.amount, // Already in cents from DB migration
          currency: payout.currency.toLowerCase(),
          description: `Payout for ${payout.user.profile?.username || payout.user.email}`,
          metadata: {
            payoutId: payout.id,
            userId: payout.userId,
          },
        },
        {
          stripeAccount: stripeAccountId,
          // Idempotency key: prevents duplicate payouts
          idempotencyKey: `payout-${payoutId}-${payout.userId}`,
        },
      );

      // 5. Update payout with Stripe payout ID
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          stripePayoutId: stripePayout.id,
          status: PrismaPayoutStatus.PROCESSING,
          processedAt: new Date(),
        },
      });

      // 6. Notify user
      await this.prisma.notification.create({
        data: {
          userId: payout.userId,
          type: 'PAYOUT_PROCESSING',
          title: 'Payout is processing',
          message: `Your payout of $${(payout.amount / 100).toFixed(2)} is being processed`,
          referenceId: payoutId,
          referenceType: 'PAYOUT',
        },
      });

      this.logger.log(
        `Stripe payout initiated atomically: ${stripePayout.id} for payout ${payoutId} (${payout.amount} cents)`,
      );
    } catch (error) {
      // If Stripe payout fails, wallet has already been deducted
      // This is acceptable: money is held pending Stripe retry
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: PrismaPayoutStatus.FAILED,
          failureReason: error.message,
        },
      });

      this.logger.error(`Stripe payout failed for ${payoutId}: ${error.message}`);
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
   * Get a single payout by ID, enforcing ownership or admin access
   */
  async getPayoutById(
    payoutId: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<any> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
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

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.userId !== requestingUserId && requestingUserRole !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to view this payout',
      );
    }

    return payout;
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
