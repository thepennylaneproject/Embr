/**
 * Revenue Utilities
 * Fair revenue splitting, fee calculation, and creator compensation
 *
 * Spark Philosophy: Creators get 85-90%, Platform takes 10-15%
 * This is 3x better than Spotify (which gives artists ~20-30%)
 */

export interface RevenueBreakdown {
  totalAmount: number; // Total amount in cents
  processingFee: number; // Payment processor fee (Stripe ~2.2%)
  platformFee: number; // Spark platform fee (10-15%)
  creatorAmount: number; // What creator receives
  platformAmount: number; // What platform keeps
}

/**
 * Stripe processing fee is approximately 2.2% + $0.30
 * For simplicity and fairness to creators, we calculate it as 2.2% only
 */
const STRIPE_PERCENTAGE = 0.022;

/**
 * Spark platform fee: 10% by default, 15% max
 * Tier-based: New creators pay 15%, established get 10%
 */
const DEFAULT_PLATFORM_FEE = 0.10; // 10%
const MAX_PLATFORM_FEE = 0.15; // 15% for new creators

/**
 * Calculate revenue split for single transaction
 * Deducts payment processor fee first, then platform fee
 *
 * Example: $10 tip
 * - Total: $10.00 (1000 cents)
 * - Stripe fee: $0.22 (22 cents, 2.2%)
 * - Platform fee: $0.88 (88 cents, 10% of remaining 880)
 * - Creator receives: $8.90 (890 cents)
 */
export function calculateRevenueBreakdown(
  totalCents: number,
  platformFeePercent: number = DEFAULT_PLATFORM_FEE,
): RevenueBreakdown {
  // Ensure fee is within acceptable range
  const fee = Math.max(0, Math.min(platformFeePercent, MAX_PLATFORM_FEE));

  // Calculate Stripe fee (2.2%)
  const stripeFee = Math.round(totalCents * STRIPE_PERCENTAGE);
  const afterStripeFee = totalCents - stripeFee;

  // Calculate platform fee (percentage of amount after Stripe fee)
  const platformFee = Math.round(afterStripeFee * fee);
  const creatorAmount = afterStripeFee - platformFee;

  return {
    totalAmount: totalCents,
    processingFee: stripeFee,
    platformFee,
    creatorAmount,
    platformAmount: stripeFee + platformFee,
  };
}

/**
 * For music streaming: Calculate per-play royalty
 * Industry standard varies: Spotify $0.003-0.005 per stream
 * Spark uses a fair model: % of subscription revenue per stream
 *
 * For now: Fixed rate of $0.01 per stream (10 cents)
 * This is higher than Spotify and ensures creators are paid fairly
 */
export function calculateStreamRoyalty(streamCount: number): number {
  const ROYALTY_PER_STREAM = 10; // 10 cents per stream
  return streamCount * ROYALTY_PER_STREAM;
}

/**
 * Calculate creator's percentage share of revenue
 * (What percentage of original amount they keep)
 */
export function getCreatorPercentage(totalAmount: number, creatorAmount: number): number {
  if (totalAmount === 0) return 0;
  return (creatorAmount / totalAmount) * 100;
}

/**
 * Simulate revenue for creator transparency
 * Shows creators exactly what they earn per transaction
 */
export function simulateCreatorEarnings(
  amount: number,
  transactionType: 'tip' | 'stream' | 'subscription' | 'purchase',
): {
  description: string;
  breakdown: RevenueBreakdown | { royalty: number };
  creatorEarns: number;
} {
  switch (transactionType) {
    case 'tip': {
      const breakdown = calculateRevenueBreakdown(amount, DEFAULT_PLATFORM_FEE);
      return {
        description: `Fan tips $${(amount / 100).toFixed(2)}`,
        breakdown,
        creatorEarns: breakdown.creatorAmount,
      };
    }

    case 'stream': {
      const royalty = calculateStreamRoyalty(amount); // amount = stream count
      return {
        description: `${amount} streams`,
        breakdown: { royalty },
        creatorEarns: royalty,
      };
    }

    case 'subscription': {
      // For subscriptions, we might do monthly revenue split
      const breakdown = calculateRevenueBreakdown(amount, DEFAULT_PLATFORM_FEE);
      return {
        description: `Monthly subscription`,
        breakdown,
        creatorEarns: breakdown.creatorAmount,
      };
    }

    case 'purchase': {
      const breakdown = calculateRevenueBreakdown(amount, DEFAULT_PLATFORM_FEE);
      return {
        description: `Track/product purchase`,
        breakdown,
        creatorEarns: breakdown.creatorAmount,
      };
    }

    default:
      throw new Error(`Unknown transaction type: ${transactionType}`);
  }
}

/**
 * Format revenue breakdown for display to creators
 */
export function formatRevenueBreakdown(breakdown: RevenueBreakdown): {
  total: string;
  stripeFee: string;
  platformFee: string;
  creatorAmount: string;
  creatorPercent: string;
} {
  return {
    total: `$${(breakdown.totalAmount / 100).toFixed(2)}`,
    stripeFee: `$${(breakdown.processingFee / 100).toFixed(2)}`,
    platformFee: `$${(breakdown.platformFee / 100).toFixed(2)}`,
    creatorAmount: `$${(breakdown.creatorAmount / 100).toFixed(2)}`,
    creatorPercent: `${getCreatorPercentage(breakdown.totalAmount, breakdown.creatorAmount).toFixed(1)}%`,
  };
}
