export type AlertUrgency = 'NORMAL' | 'URGENT' | 'CRITICAL';
export type PollStatus = 'OPEN' | 'CLOSED';
export type TreasuryTransactionType = 'CONTRIBUTION' | 'DISBURSEMENT' | 'PLATFORM_FEE' | 'REFUND';

// ─── Action Alerts ────────────────────────────────────────────────────────────

export interface ActionAlert {
  id: string;
  groupId: string;
  authorId: string;
  author?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  title: string;
  body: string;
  urgency: AlertUrgency;
  ctaText?: string;
  ctaUrl?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertInput {
  title: string;
  body: string;
  urgency?: AlertUrgency;
  ctaText?: string;
  ctaUrl?: string;
  expiresAt?: string;
}

// ─── Polls ────────────────────────────────────────────────────────────────────

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  voteCount: number;
  _count?: { votes: number };
  votes?: { id: string }[];
}

export interface Poll {
  id: string;
  authorId: string;
  author?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  groupId?: string;
  eventId?: string;
  question: string;
  description?: string;
  multiSelect: boolean;
  isAnonymous: boolean;
  endsAt?: string;
  status: PollStatus;
  options: PollOption[];
  _count?: { votes: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePollInput {
  question: string;
  description?: string;
  options: string[];
  multiSelect?: boolean;
  isAnonymous?: boolean;
  endsAt?: string;
}

export interface VoteInput {
  optionIds: string[];
}

// ─── Group Treasury ───────────────────────────────────────────────────────────

export interface GroupTreasuryTransaction {
  id: string;
  treasuryId: string;
  type: TreasuryTransactionType;
  amount: number;
  description: string;
  contributorId?: string;
  contributor?: { id: string; username: string; profile?: { displayName: string; avatarUrl?: string } };
  pollId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
}

export interface GroupTreasury {
  id: string;
  groupId: string;
  balance: number;
  totalRaised: number;
  transactions: GroupTreasuryTransaction[];
  createdAt: string;
  updatedAt: string;
}

export interface ContributeInput {
  amount: number;
  description?: string;
  stripePaymentIntentId?: string;
}

export interface DisburseInput {
  amount: number;
  purpose: string;
  pollId?: string;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export const ALERT_URGENCY_LABELS: Record<AlertUrgency, string> = {
  NORMAL: 'Normal',
  URGENT: 'Urgent',
  CRITICAL: 'Critical',
};

export const ALERT_URGENCY_COLORS: Record<AlertUrgency, string> = {
  NORMAL: 'var(--embr-accent)',
  URGENT: '#f59e0b',
  CRITICAL: '#ef4444',
};

export const TREASURY_TRANSACTION_LABELS: Record<TreasuryTransactionType, string> = {
  CONTRIBUTION: 'Contribution',
  DISBURSEMENT: 'Disbursement',
  PLATFORM_FEE: 'Platform Fee',
  REFUND: 'Refund',
};
