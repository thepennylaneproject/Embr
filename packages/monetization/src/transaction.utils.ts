/**
 * Transaction Utilities
 * Transaction recording, status tracking, and audit logs
 */

export type TransactionType =
  | 'TIP_SENT'
  | 'TIP_RECEIVED'
  | 'PURCHASE'
  | 'PAYOUT'
  | 'PAYWALL_UNLOCK'
  | 'GIG_PAYMENT'
  | 'GIG_ESCROW'
  | 'GIG_RELEASE'
  | 'STREAM_ROYALTY'
  | 'PLATFORM_FEE'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'CREDIT'
  | 'DEBIT';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number; // In cents
  fee: number;
  netAmount: number;
  status: TransactionStatus;
  description: string;
  referenceId?: string; // Link to related object (post ID, gig ID, track ID, etc.)
  referenceType?: string; // 'post', 'gig', 'track', 'tip', etc.
  stripePaymentIntentId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Create transaction metadata
 */
export function createTransactionMetadata(
  type: TransactionType,
  data: Record<string, any>,
): Record<string, any> {
  return {
    ...data,
    timestamp: new Date().toISOString(),
    type,
  };
}

/**
 * Get human-readable transaction description
 */
export function getTransactionDescription(
  type: TransactionType,
  metadata?: Record<string, any>,
): string {
  const descriptions: Record<TransactionType, string> = {
    TIP_SENT: 'Sent tip',
    TIP_RECEIVED: 'Received tip',
    PURCHASE: 'Purchase',
    PAYOUT: 'Payout to bank account',
    PAYWALL_UNLOCK: 'Paywall unlock',
    GIG_PAYMENT: 'Gig payment',
    GIG_ESCROW: 'Gig escrow hold',
    GIG_RELEASE: 'Gig escrow released',
    STREAM_ROYALTY: 'Stream royalty',
    PLATFORM_FEE: 'Platform fee',
    REFUND: 'Refund',
    ADJUSTMENT: 'Balance adjustment',
    CREDIT: 'Balance credit',
    DEBIT: 'Balance debit',
  };

  let description = descriptions[type] || 'Transaction';

  if (metadata?.itemName) {
    description += ` - ${metadata.itemName}`;
  }

  return description;
}

/**
 * Get transaction category for analytics
 */
export function getTransactionCategory(type: TransactionType): 'income' | 'expense' | 'transfer' {
  const incomeTypes: TransactionType[] = [
    'TIP_RECEIVED',
    'PURCHASE',
    'GIG_RELEASE',
    'STREAM_ROYALTY',
    'CREDIT',
  ];

  const expenseTypes: TransactionType[] = [
    'TIP_SENT',
    'PAYOUT',
    'PAYWALL_UNLOCK',
    'GIG_PAYMENT',
    'PLATFORM_FEE',
    'REFUND',
    'DEBIT',
  ];

  if (incomeTypes.includes(type)) return 'income';
  if (expenseTypes.includes(type)) return 'expense';
  return 'transfer';
}

/**
 * Is transaction successful/final
 */
export function isTransactionFinal(status: TransactionStatus): boolean {
  return ['COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'].includes(status);
}

/**
 * Is transaction still in progress
 */
export function isTransactionPending(status: TransactionStatus): boolean {
  return ['PENDING', 'PROCESSING'].includes(status);
}

/**
 * Can transaction be refunded
 */
export function canRefundTransaction(status: TransactionStatus): boolean {
  return status === 'COMPLETED';
}

/**
 * Group transactions by period for analytics
 */
export function groupTransactionsByPeriod(
  transactions: Transaction[],
  period: 'day' | 'week' | 'month' | 'year',
): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  transactions.forEach((tx) => {
    const date = new Date(tx.createdAt);
    let key: string;

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = date.toISOString().substring(0, 7);
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
    }

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(tx);
  });

  return grouped;
}

/**
 * Calculate transaction summary
 */
export function summarizeTransactions(transactions: Transaction[]): {
  totalIncome: number;
  totalExpense: number;
  totalNet: number;
  completedCount: number;
  pendingCount: number;
} {
  let totalIncome = 0;
  let totalExpense = 0;
  let completedCount = 0;
  let pendingCount = 0;

  transactions.forEach((tx) => {
    const category = getTransactionCategory(tx.type);

    if (category === 'income') {
      totalIncome += tx.netAmount;
    } else if (category === 'expense') {
      totalExpense += tx.netAmount;
    }

    if (isTransactionFinal(tx.status)) {
      completedCount++;
    } else if (isTransactionPending(tx.status)) {
      pendingCount++;
    }
  });

  return {
    totalIncome,
    totalExpense,
    totalNet: totalIncome - totalExpense,
    completedCount,
    pendingCount,
  };
}
