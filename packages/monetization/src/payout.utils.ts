/**
 * Payout Utilities
 * Withdrawal requests, payout processing, and status tracking
 */

export type PayoutStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED';

export interface Payout {
  id: string;
  userId: string;
  walletId: string;
  amount: number; // In cents
  fee: number; // Platform processing fee
  netAmount: number; // Amount actually received
  currency: string;
  status: PayoutStatus;
  stripeTransferId?: string;
  bankAccountLast4?: string;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  failureReason?: string;
  note?: string;
  approvedAt?: Date;
  approvedBy?: string;
}

/**
 * Check if creator can request payout
 */
export function canRequestPayout(
  balance: number,
  minimumThreshold: number = 500, // $5 minimum
): boolean {
  return balance >= minimumThreshold;
}

/**
 * Calculate payout processing fee
 * Spark charges 1% for payouts (covers payment processor fees)
 */
export function calculatePayoutFee(amount: number, feePercent: number = 0.01): number {
  return Math.round(amount * feePercent);
}

/**
 * Calculate net payout amount
 */
export function calculateNetPayout(amount: number, feePercent: number = 0.01): {
  gross: number;
  fee: number;
  net: number;
} {
  const fee = calculatePayoutFee(amount, feePercent);
  return {
    gross: amount,
    fee,
    net: amount - fee,
  };
}

/**
 * Get human-readable payout status
 */
export function getPayoutStatusLabel(status: PayoutStatus): string {
  const labels: Record<PayoutStatus, string> = {
    PENDING: 'Pending review',
    APPROVED: 'Approved, processing soon',
    PROCESSING: 'Being transferred to your bank',
    COMPLETED: 'Successfully deposited',
    REJECTED: 'Request rejected',
    FAILED: 'Transfer failed',
  };

  return labels[status];
}

/**
 * Is payout status final
 */
export function isPayoutFinal(status: PayoutStatus): boolean {
  return ['COMPLETED', 'REJECTED', 'FAILED'].includes(status);
}

/**
 * Can creator cancel payout request
 */
export function canCancelPayout(status: PayoutStatus): boolean {
  return ['PENDING', 'APPROVED'].includes(status);
}

/**
 * Estimate delivery time based on status
 */
export function getPayoutDeliveryEstimate(status: PayoutStatus): string {
  switch (status) {
    case 'PENDING':
      return '24-48 hours for review';
    case 'APPROVED':
      return '1-3 business days';
    case 'PROCESSING':
      return '1-3 business days';
    case 'COMPLETED':
      return 'Completed';
    case 'REJECTED':
      return 'Request rejected';
    case 'FAILED':
      return 'Transfer failed - contact support';
    default:
      return 'Unknown';
  }
}

/**
 * Validate bank account for payout
 * (Simplified - real implementation would validate with payment processor)
 */
export function isValidBankAccount(
  accountNumber: string,
  routingNumber: string,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!accountNumber || accountNumber.length < 8) {
    errors.push('Invalid account number');
  }

  if (!routingNumber || routingNumber.length !== 9) {
    errors.push('Invalid routing number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get payout history statistics
 */
export function getPayoutStats(payouts: Payout[]): {
  totalPayouts: number;
  totalAmount: number;
  averagePayout: number;
  lastPayoutDate?: Date;
  nextPayoutEstimate?: Date;
  successRate: number;
} {
  const completedPayouts = payouts.filter((p) => p.status === 'COMPLETED');
  const totalAmount = completedPayouts.reduce((sum, p) => sum + p.netAmount, 0);
  const totalPayouts = completedPayouts.length;

  const lastPayout = payouts
    .filter((p) => p.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

  const successRate =
    payouts.length > 0 ? (completedPayouts.length / payouts.length) * 100 : 0;

  return {
    totalPayouts,
    totalAmount,
    averagePayout: totalPayouts > 0 ? Math.round(totalAmount / totalPayouts) : 0,
    lastPayoutDate: lastPayout?.completedAt,
    nextPayoutEstimate: undefined, // Would be calculated based on pending/approved payouts
    successRate,
  };
}
