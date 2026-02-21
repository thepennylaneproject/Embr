import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '../dto/wallet.dto';
import { TransactionType as PrismaTransactionType } from '@prisma/client';

interface CreateTransactionParams {
  userId: string;
  type: PrismaTransactionType;
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a transaction entry and update wallet balance
   */
  private async recordTransaction(params: CreateTransactionParams): Promise<void> {
    const { userId, type, amount, description, referenceId, referenceType, metadata } = params;

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: amount,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          currency: 'USD',
        },
        update: {
          balance: {
            increment: amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          wallet: { connect: { id: wallet.id } },
          user: { connect: { id: userId } },
          type,
          amount,
          description,
          referenceId,
          referenceType,
          metadata: metadata || {},
        },
      });
    });
  }

  /**
   * Record a tip transaction
   * Sender: negative amount
   * Recipient: positive amount (after platform fee)
   */
  async recordTipTransaction(
    senderId: string,
    recipientId: string,
    amount: number,
    tipId: string,
  ): Promise<void> {
    const platformFee = amount * 0.05;
    const netAmount = amount - platformFee;

    await this.recordTransaction({
      userId: senderId,
      type: PrismaTransactionType.TIP_SENT,
      amount: -Math.abs(amount),
      description: 'Tip sent',
      referenceId: tipId,
      referenceType: 'TIP',
      metadata: { grossAmount: amount, platformFee, netAmount },
    });

    await this.recordTransaction({
      userId: recipientId,
      type: PrismaTransactionType.TIP_RECEIVED,
      amount: Math.abs(netAmount),
      description: 'Tip received',
      referenceId: tipId,
      referenceType: 'TIP',
      metadata: { grossAmount: amount, platformFee, netAmount },
    });

    if (platformFee > 0) {
      await this.recordTransaction({
        userId: recipientId,
        type: PrismaTransactionType.PLATFORM_FEE,
        amount: -Math.abs(platformFee),
        description: 'Platform fee',
        referenceId: tipId,
        referenceType: 'FEE',
        metadata: { grossAmount: amount, platformFee, netAmount },
      });
    }
  }
  /**
   * Record a payout transaction
   */
  async recordPayoutTransaction(
    userId: string,
    amount: number,
    payoutId: string,
  ): Promise<void> {
    await this.recordTransaction({
      userId,
      type: PrismaTransactionType.PAYOUT,
      amount: -Math.abs(amount),
      description: 'Payout to bank account',
      referenceId: payoutId,
      referenceType: 'PAYOUT',
      metadata: { payoutId },
    });
  }

  /**
   * Get transaction history for a user
   */
  async getUserTransactions(
    userId: string,
    filters: {
      type?: TransactionType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ transactions: any[]; total: number }> {
    const { type, startDate, endDate, page = 1, limit = 20 } = filters;

    const where: any = { userId };

    if (type) {
      // Map DTO TransactionType to Prisma TransactionType
      switch (type) {
        case TransactionType.TIP:
          where.type = {
            in: [
              PrismaTransactionType.TIP_SENT,
              PrismaTransactionType.TIP_RECEIVED,
            ],
          };
          break;
        case TransactionType.WITHDRAWAL:
          where.type = PrismaTransactionType.PAYOUT;
          break;
        case TransactionType.GIG_REFUND:
          where.type = PrismaTransactionType.REFUND;
          break;
        case TransactionType.PLATFORM_FEE:
          where.type = PrismaTransactionType.PLATFORM_FEE;
          break;
        case TransactionType.GIG_PAYMENT:
          where.type = PrismaTransactionType.GIG_PAYMENT;
          break;
        default:
          // For other types, try to match by name if they exist in Prisma enum, otherwise ignore or cast
          if (type in PrismaTransactionType) {
            where.type = type as unknown as PrismaTransactionType;
          }
          break;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  /**
   * Verify wallet integrity by comparing balance to transaction sum
   */
  async verifyWalletIntegrity(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return { valid: false, reason: 'Wallet not found' };
    }

    const aggregate = await this.prisma.transaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const computed = aggregate._sum.amount || 0;
    const diff = wallet.balance - computed;

    return {
      valid: Math.abs(diff) < 0.01,
      walletBalance: wallet.balance,
      computedBalance: computed,
      difference: diff,
    };
  }

  /**
   * Get financial summary for date range
   */
  async getFinancialSummary(userId: string, start: Date, end: Date) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
    });

    const totalIn = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOut = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      count: transactions.length,
      start,
      end,
    };
  }
}
