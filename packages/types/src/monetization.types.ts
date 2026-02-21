// Wallet Types
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletBalance {
  available: number;
  pending: number;
  total: number;
  currency: string;
}

export interface WalletStats {
  totalReceived: number;
  totalSent: number;
  totalPayouts: number;
  numberOfTips: number;
  averageTipReceived: number;
}

// Transaction Types
export enum TransactionType {
  TIP_RECEIVED = 'TIP_RECEIVED',
  TIP_SENT = 'TIP_SENT',
  PAYOUT = 'PAYOUT',
  REFUND = 'REFUND',
  FEE = 'FEE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
}

// Tip Types
export enum TipStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum TipAmountPreset {
  SMALL = 'SMALL', // $1
  MEDIUM = 'MEDIUM', // $5
  LARGE = 'LARGE', // $10
  CUSTOM = 'CUSTOM',
}

export interface Tip {
  id: string;
  senderId: string;
  recipientId: string;
  postId?: string;
  amount: number;
  message?: string;
  status: TipStatus;
  stripePaymentIntentId?: string;
  createdAt: string;
  completedAt?: string;
  sender?: {
    id: string;
    profile?: {
      username: string;
      displayName: string;
      avatarUrl?: string;
    };
  };
  recipient?: {
    id: string;
    profile?: {
      username: string;
      displayName: string;
      avatarUrl?: string;
    };
  };
  post?: {
    id: string;
    content?: string;
    thumbnailUrl?: string;
  };
}

export interface CreateTipRequest {
  recipientId: string;
  postId?: string;
  amount: number;
  preset?: TipAmountPreset;
  message?: string;
  paymentMethodId?: string;
}

export interface TipsResponse {
  tips: Tip[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TipStats {
  totalReceived: number;
  totalSent: number;
  tipsReceivedCount: number;
  tipsSentCount: number;
  topTipper?: {
    user: {
      id: string;
      profile?: {
        username: string;
        displayName: string;
        avatarUrl?: string;
      };
    };
    totalTipped: number;
  };
  averageTipReceived: number;
  averageTipSent: number;
}

// Payout Types
export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export interface Payout {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  note?: string;
  stripePayoutId?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    profile?: {
      username: string;
      displayName: string;
    };
  };
}

export interface CreatePayoutRequest {
  amount: number;
  note?: string;
}

export interface PayoutsResponse {
  payouts: Payout[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PayoutStats {
  totalPayouts: number;
  totalAmount: number;
  pendingAmount: number;
  lastPayoutDate?: string;
}

// Stripe Connect Types
export interface StripeConnectAccountStatus {
  hasAccount: boolean;
  isOnboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requiresAction: boolean;
  accountId?: string;
}

export interface StripeConnectAccountDetails {
  id: string;
  email?: string;
  country: string;
  defaultCurrency?: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pendingVerification: string[];
  };
  externalAccounts?: Array<{
    id: string;
    object: string;
    last4?: string;
    bankName?: string;
    country: string;
    currency: string;
  }>;
}

export interface CreateStripeConnectAccountRequest {
  country: string;
  email: string;
}

export interface CreateStripeConnectAccountResponse {
  accountId: string;
  onboardingUrl: string;
}
