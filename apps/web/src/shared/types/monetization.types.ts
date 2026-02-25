/**
 * Monetization Types
 * Types for tips, wallet, payouts, and Stripe Connect
 */

// ============================================================================
// ENUMS
// ============================================================================

export const TipAmountPreset = {
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
  CUSTOM: 'CUSTOM',
} as const;
export type TipAmountPreset = typeof TipAmountPreset[keyof typeof TipAmountPreset];

export const TransactionType = {
  TIP_RECEIVED: 'TIP_RECEIVED',
  TIP_SENT: 'TIP_SENT',
  PAYOUT: 'PAYOUT',
  REFUND: 'REFUND',
  ESCROW_FUNDED: 'ESCROW_FUNDED',
  ESCROW_RELEASED: 'ESCROW_RELEASED',
  PLATFORM_FEE: 'PLATFORM_FEE',
} as const;
export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export const PayoutStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type PayoutStatus = typeof PayoutStatus[keyof typeof PayoutStatus];

// ============================================================================
// TIP INTERFACES
// ============================================================================

export interface Tip {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  message?: string;
  preset?: TipAmountPreset;
  contentId?: string;
  contentType?: string;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  recipient?: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
}

export interface CreateTipRequest {
  recipientId: string;
  amount: number;
  preset?: TipAmountPreset;
  message?: string;
  contentId?: string;
  contentType?: string;
}

export interface TipStats {
  totalReceived: number;
  totalSent: number;
  tipsReceivedCount: number;
  tipsSentCount: number;
  averageReceived: number;
  topTippers?: {
    userId: string;
    username: string;
    displayName: string;
    avatar?: string;
    totalAmount: number;
    tipsCount: number;
  }[];
}

// ============================================================================
// WALLET INTERFACES
// ============================================================================

export interface WalletBalance {
  available: number;
  pending: number;
  currency: string;
  lastUpdated: Date;
}

export interface WalletStats {
  totalEarned: number;
  totalSpent: number;
  totalWithdrawn: number;
  lifetimeBalance: number;
  numberOfTips: number;
  averageTipReceived: number;
  gigsEarnings?: number;
  numberOfGigs?: number;
  tipsEarnings?: number;
  musicEarnings?: number;
  musicDownloads?: number;
  subscriptionEarnings?: number;
  activeSubscribers?: number;
  marketplaceEarnings?: number;
  salesCount?: number;
  numberOfLicenses?: number;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// PAYOUT INTERFACES
// ============================================================================

export interface Payout {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  note?: string;
  stripePayoutId?: string;
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePayoutRequest {
  amount: number;
  note?: string;
}

export interface PayoutStats {
  totalPaidOut: number;
  pendingAmount: number;
  payoutsCount: number;
  lastPayoutDate?: Date;
  averagePayoutAmount: number;
}

// ============================================================================
// STRIPE CONNECT INTERFACES
// ============================================================================

export interface StripeConnectAccountStatus {
  hasAccount: boolean;
  accountId?: string;
  isOnboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requiresAction: boolean;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
}

export interface StripeConnectAccountDetails {
  accountId: string;
  email: string;
  country: string;
  businessType: string;
  defaultCurrency: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  createdAt: Date;
  externalAccounts?: {
    id: string;
    type: 'bank_account' | 'card';
    last4: string;
    bankName?: string;
    brand?: string;
  }[];
}

export interface CreateStripeAccountRequest {
  email: string;
  country?: string;
}

export interface CreateStripeAccountResponse {
  accountId: string;
  onboardingUrl: string;
}

export interface AccountLinkResponse {
  url: string;
  expiresAt: Date;
}
