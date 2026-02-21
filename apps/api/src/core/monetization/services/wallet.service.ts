import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType as PrismaTransactionType } from '@prisma/client';
import { TransactionService } from './transaction.service';
import { WalletBalanceDto } from '../dto/wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
  ) {}

  /**
   * Create a wallet for a new user
   */
  async createWallet(userId: string): Promise<any> {
    try {
      const wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          currency: 'USD',
        },
      });

      this.logger.log(`Wallet created for user ${userId}`);
      return wallet;
    } catch (error) {
      // Wallet might already exist
      return this.getWallet(userId);
    }
  }

  /**
   * Get wallet for a user
   */
  async getWallet(userId: string): Promise<any> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
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

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for user ${userId}`);
    }

    return wallet;
  }

  /**
   * Get wallet balance with pending calculations
   */
  async getWalletBalance(userId: string): Promise<WalletBalanceDto> {
    const wallet = await this.getWallet(userId);

    // Calculate pending balance from pending payouts
    const pendingPayouts = await this.prisma.payout.aggregate({
      where: {
        userId,
        status: {
          in: ['PENDING', 'APPROVED', 'PROCESSING'],
        },
      },
      _sum: {
        amount: true,
      },
    });

    const pending = pendingPayouts._sum.amount || 0;
    const available = Math.max(0, wallet.balance - pending);

    return {
      available: parseFloat(available.toFixed(2)),
      pending: parseFloat(pending.toFixed(2)),
      total: parseFloat(wallet.balance.toFixed(2)),
      currency: wallet.currency,
    };
  }

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(
    userId: string,
    amount: number,
  ): Promise<boolean> {
    const balance = await this.getWalletBalance(userId);
    return balance.available >= amount;
  }

  /**
   * Add funds to wallet (for testing or admin actions)
   */
  async addFunds(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<any> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const wallet = await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    // Record transaction
    await this.prisma.transaction.create({
      data: {
        user: { connect: { id: userId } },
        wallet: { connect: { id: wallet.id } },
        type: PrismaTransactionType.CREDIT,
        amount,
        description: reason,
        referenceType: 'ADJUSTMENT',
      },
    });

    this.logger.log(`Added ${amount} to wallet for user ${userId}: ${reason}`);
    return wallet;
  }

  /**
   * Deduct funds from wallet
   */
  async deductFunds(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<any> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const hasFunds = await this.hasSufficientBalance(userId, amount);
    if (!hasFunds) {
      throw new BadRequestException('Insufficient balance');
    }

    const wallet = await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    // Record transaction
    await this.prisma.transaction.create({
      data: {
        user: { connect: { id: userId } },
        wallet: { connect: { id: wallet.id } },
        type: PrismaTransactionType.DEBIT,
        amount: -amount,
        description: reason,
        referenceType: 'ADJUSTMENT',
      },
    });

    this.logger.log(
      `Deducted ${amount} from wallet for user ${userId}: ${reason}`,
    );
    return wallet;
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId: string): Promise<{
    totalReceived: number;
    totalSent: number;
    totalPayouts: number;
    numberOfTips: number;
    averageTipReceived: number;
  }> {
    const [tipsReceived, tipsSent, payouts] = await Promise.all([
      this.prisma.tip.aggregate({
        where: {
          recipientId: userId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.tip.aggregate({
        where: {
          senderId: userId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      this.prisma.payout.aggregate({
        where: {
          userId,
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
    ]);

    const totalReceived = tipsReceived._sum.amount || 0;
    const totalSent = tipsSent._sum.amount || 0;
    const totalPayouts = payouts._sum.amount || 0;
    const numberOfTips = tipsReceived._count;
    const averageTipReceived =
      numberOfTips > 0 ? totalReceived / numberOfTips : 0;

    return {
      totalReceived: parseFloat(totalReceived.toFixed(2)),
      totalSent: parseFloat(totalSent.toFixed(2)),
      totalPayouts: parseFloat(totalPayouts.toFixed(2)),
      numberOfTips,
      averageTipReceived: parseFloat(averageTipReceived.toFixed(2)),
    };
  }

  /**
   * Get top earners (for leaderboards)
   */
  async getTopEarners(
    limit: number = 10,
    period: 'day' | 'week' | 'month' | 'all' = 'month',
  ): Promise<any[]> {
    const startDate = new Date();
    if (period === 'day') {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setFullYear(2000); // Beginning of time
    }

    const tips = await this.prisma.tip.groupBy({
      by: ['recipientId'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
      take: limit,
    });

    // Fetch user details
    const enrichedTips = await Promise.all(
      tips.map(async (tip) => {
        const user = await this.prisma.user.findUnique({
          where: { id: tip.recipientId },
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });

        return {
          user,
          totalEarned: tip._sum.amount || 0,
          tipCount: tip._count,
        };
      }),
    );

    return enrichedTips;
  }
}
