/**
 * Wallet Utilities
 * Balance tracking, wallet operations, and creator financial info
 */

/**
 * Wallet balance in cents (USD)
 */
export interface WalletBalance {
  available: number; // Available to withdraw (in cents)
  pending: number; // Pending/escrow balance (in cents)
  total: number; // available + pending
}

/**
 * Calculate wallet balance
 */
export function calculateWalletBalance(
  available: number,
  pending: number,
): WalletBalance {
  return {
    available,
    pending,
    total: available + pending,
  };
}

/**
 * Format balance to currency (USD)
 */
export function formatBalance(cents: number): string {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Check if wallet has sufficient balance for transaction
 */
export function hasSufficientBalance(balance: number, amount: number): boolean {
  return balance >= amount;
}

/**
 * Calculate minimum payout threshold
 * (Stripe minimum is $0.50, but we might want higher like $5)
 */
export function meetsPayoutThreshold(balance: number, threshold: number = 500): boolean {
  return balance >= threshold; // 500 cents = $5
}

/**
 * Get wallet status
 */
export function getWalletStatus(balance: number): 'low' | 'medium' | 'high' {
  const dollars = centsToDollars(balance);
  if (dollars < 5) return 'low';
  if (dollars < 50) return 'medium';
  return 'high';
}

export interface WalletInfo {
  userId: string;
  balance: WalletBalance;
  totalEarned: number; // Lifetime earnings in cents
  totalWithdrawn: number; // Lifetime payouts in cents
  monthlyEarnings: number; // Current month earnings
  status: 'low' | 'medium' | 'high';
  canWithdraw: boolean;
}

/**
 * Generate wallet info summary for creator dashboard
 */
export function generateWalletInfo(
  userId: string,
  available: number,
  pending: number,
  totalEarned: number,
  totalWithdrawn: number,
  monthlyEarnings: number,
): WalletInfo {
  const balance = calculateWalletBalance(available, pending);
  const status = getWalletStatus(balance.available);
  const canWithdraw = meetsPayoutThreshold(balance.available);

  return {
    userId,
    balance,
    totalEarned,
    totalWithdrawn,
    monthlyEarnings,
    status,
    canWithdraw,
  };
}
