/**
 * Shared Monetization Types
 */

export interface Wallet {
  id: string;
  userId: string;
  balance: number; // Available balance in cents
  pendingBalance: number; // Escrow/pending in cents
  totalEarned: number; // Lifetime earnings in cents
  totalWithdrawn: number; // Lifetime payouts in cents
  currency: string;
  stripeConnectAccountId?: string;
  onboardingCompleted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletSummary {
  available: string; // Formatted as "$X.XX"
  pending: string;
  total: string;
  status: 'low' | 'medium' | 'high';
  canWithdraw: boolean;
  minimumWithdrawal: string;
}

export interface CreatorEarnings {
  userId: string;
  period: 'today' | 'week' | 'month' | 'year' | 'all-time';
  totalEarnings: number; // cents
  transactionCount: number;
  averageTransaction: number; // cents
  topSource: string; // 'tips', 'streams', 'gigs', etc.
}

export interface CreatorDashboard {
  wallet: WalletSummary;
  earnings: CreatorEarnings;
  recentTransactions: Transaction[];
  payoutHistory: PayoutInfo[];
}

export interface Transaction {
  id: string;
  type: string;
  amount: number; // cents
  description: string;
  status: string;
  date: Date;
  referenceId?: string;
}

export interface PayoutInfo {
  id: string;
  amount: string;
  status: string;
  date: Date;
  method: string;
}

export interface TipMetadata {
  senderId: string;
  recipientId: string;
  contentType: 'post' | 'track' | 'gig' | 'profile';
  contentId: string;
  message?: string;
  isAnonymous: boolean;
}
