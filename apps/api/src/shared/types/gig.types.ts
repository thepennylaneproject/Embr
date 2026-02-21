/**
 * Shared TypeScript types for Gigs & Jobs Marketplace
 * Used across frontend and backend
 */

// ============================================================================
// ENUMS
// ============================================================================

export const GigStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;
export type GigStatus = typeof GigStatus[keyof typeof GigStatus];

export const GigCategory = {
  VIDEO_EDITING: 'VIDEO_EDITING',
  GRAPHIC_DESIGN: 'GRAPHIC_DESIGN',
  WRITING: 'WRITING',
  MUSIC_AUDIO: 'MUSIC_AUDIO',
  ANIMATION: 'ANIMATION',
  PHOTOGRAPHY: 'PHOTOGRAPHY',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  CONSULTING: 'CONSULTING',
  WEB_DEV: 'WEB_DEV',
  VOICE_OVER: 'VOICE_OVER',
  OTHER: 'OTHER',
} as const;
export type GigCategory = typeof GigCategory[keyof typeof GigCategory];

export const GigBudgetType = {
  FIXED: 'FIXED',
  HOURLY: 'HOURLY',
  MILESTONE: 'MILESTONE',
} as const;
export type GigBudgetType = typeof GigBudgetType[keyof typeof GigBudgetType];

export const GigExperienceLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  EXPERT: 'EXPERT',
} as const;
export type GigExperienceLevel = typeof GigExperienceLevel[keyof typeof GigExperienceLevel];

export const ApplicationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApplicationStatus = typeof ApplicationStatus[keyof typeof ApplicationStatus];

export const MilestoneStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type MilestoneStatus = typeof MilestoneStatus[keyof typeof MilestoneStatus];

export const EscrowStatus = {
  CREATED: 'CREATED',
  FUNDED: 'FUNDED',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED',
} as const;
export type EscrowStatus = typeof EscrowStatus[keyof typeof EscrowStatus];

export const DisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
} as const;
export type DisputeStatus = typeof DisputeStatus[keyof typeof DisputeStatus];

// ============================================================================
// INTERFACES
// ============================================================================

export interface Gig {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  category: GigCategory;
  budgetType: GigBudgetType;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  experienceLevel: GigExperienceLevel;
  estimatedDuration: number; // in days
  skills: string[];
  deliverables: string[];
  status: GigStatus;
  applicationsCount: number;
  viewsCount: number;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  creator?: PublicProfile;
}

export interface GigMilestone {
  id: string;
  gigId: string;
  applicationId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: MilestoneStatus;
  order: number;
  submittedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Application {
  id: string;
  gigId: string;
  applicantId: string;
  coverLetter: string;
  proposedBudget: number;
  proposedTimeline: number; // in days
  portfolioLinks: string[];
  relevantExperience: string;
  milestoneProposals?: MilestoneProposal[];
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
  applicant?: PublicProfile;
  gig?: Gig;
}

export interface MilestoneProposal {
  title: string;
  description: string;
  amount: number;
  estimatedDays: number;
}

export interface Escrow {
  id: string;
  gigId: string;
  applicationId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  status: EscrowStatus;
  stripePaymentIntentId?: string;
  stripeFundingMethod?: string;
  createdAt: Date;
  updatedAt: Date;
  fundedAt?: Date;
  releasedAt?: Date;
  refundedAt?: Date;
}

export interface Dispute {
  id: string;
  gigId: string;
  applicationId: string;
  escrowId: string;
  raisedBy: string; // userId
  against: string; // userId
  reason: string;
  description: string;
  evidence: string[];
  status: DisputeStatus;
  resolution?: string;
  resolvedBy?: string; // admin userId
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface GigReview {
  id: string;
  gigId: string;
  applicationId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  professionalism: number;
  communication: number;
  quality: number;
  timeliness: number;
  createdAt: Date;
  updatedAt: Date;
  reviewer?: PublicProfile;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  verified?: boolean;
}

// ============================================================================
// FILTER & SEARCH TYPES
// ============================================================================

export interface GigFilters {
  category?: GigCategory;
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: GigBudgetType;
  experienceLevel?: GigExperienceLevel;
  skills?: string[];
  sortBy?: 'recent' | 'budget_high' | 'budget_low' | 'deadline';
}

export interface GigSearchParams extends GigFilters {
  query?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginatedGigs {
  gigs: Gig[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedApplications {
  applications: Application[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GigStats {
  totalGigs: number;
  activeGigs: number;
  completedGigs: number;
  totalEarned: number;
  totalSpent: number;
  averageRating: number;
  reviewsCount: number;
}

export interface ApplicationWithDetails extends Application {
  gig: Gig;
  applicant: PublicProfile;
  escrow?: Escrow;
  milestones?: GigMilestone[];
}

export interface GigWithDetails extends Gig {
  creator: PublicProfile;
  acceptedApplication?: ApplicationWithDetails;
  milestones?: GigMilestone[];
  escrow?: Escrow;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface CreateGigData {
  title: string;
  description: string;
  category: GigCategory;
  budgetType: GigBudgetType;
  budgetMin: number;
  budgetMax: number;
  currency?: string;
  experienceLevel: GigExperienceLevel;
  estimatedDuration: number;
  skills: string[];
  deliverables: string[];
  attachments?: string[];
  expiresAt?: Date;
}

export interface UpdateGigData extends Partial<CreateGigData> {
  status?: GigStatus;
}

export interface CreateApplicationData {
  gigId: string;
  coverLetter: string;
  proposedBudget: number;
  proposedTimeline: number;
  portfolioLinks: string[];
  relevantExperience: string;
  milestones?: MilestoneProposal[];
}

export interface UpdateApplicationData {
  status?: ApplicationStatus;
}

export interface CreateMilestoneData {
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  order: number;
}

export interface UpdateMilestoneData {
  status?: MilestoneStatus;
  feedback?: string;
}

export interface FundEscrowData {
  stripePaymentMethodId: string;
}

export interface ReleaseMilestoneData {
  milestoneId: string;
}

export interface RaiseDisputeData {
  reason: string;
  description: string;
  evidence: string[];
}

export interface CreateReviewData {
  rating: number;
  comment: string;
  professionalism: number;
  communication: number;
  quality: number;
  timeliness: number;
}
