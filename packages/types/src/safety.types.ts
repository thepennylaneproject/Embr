// Enums
export enum ReportReason {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  ILLEGAL = 'illegal',
  NSFW_UNLABELED = 'nsfw_unlabeled',
  COPYRIGHT = 'copyright',
  IMPERSONATION = 'impersonation',
  SELF_HARM = 'self_harm',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  ACTION_TAKEN = 'action_taken',
  DISMISSED = 'dismissed',
}

export enum ReportEntityType {
  POST = 'post',
  USER = 'user',
  MESSAGE = 'message',
  COMMENT = 'comment',
}

export enum ActionType {
  WARNING = 'warning',
  CONTENT_REMOVAL = 'content_removal',
  SUSPENSION = 'suspension',
  BAN = 'ban',
}

export enum AppealStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export enum FilterAction {
  HIDE = 'hide',
  FLAG = 'flag',
  BLOCK = 'block',
}

// Report Types
export interface CreateReportDto {
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  description?: string;
  evidenceUrls?: string[];
}

export interface UpdateReportDto {
  status?: ReportStatus;
  action?: string;
  reviewNote?: string;
}

export interface QueryReportsDto {
  status?: ReportStatus;
  entityType?: ReportEntityType;
  reason?: ReportReason;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface Report {
  id: string;
  reporterId: string;
  reporter: {
    id: string;
    username: string;
    profile?: {
      avatarUrl?: string;
      displayName?: string;
    };
  };
  reportedUserId?: string;
  reportedUser?: {
    id: string;
    username: string;
    profile?: {
      avatarUrl?: string;
      displayName?: string;
    };
  };
  reportedPostId?: string;
  reportedPost?: {
    id: string;
    content: string;
    mediaUrls?: string[];
  };
  reportedCommentId?: string;
  reportedComment?: {
    id: string;
    content: string;
  };
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  reviewerId?: string;
  reviewedAt?: Date;
  action?: string;
  createdAt: Date;
}

// Moderation Action Types
export interface CreateModerationActionDto {
  userId: string;
  type: ActionType;
  reason: string;
  duration?: number;
  postId?: string;
  commentId?: string;
  appealable?: boolean;
  notifyUser?: boolean;
}

export interface QueryModerationActionsDto {
  type?: ActionType;
  userId?: string;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface ModerationAction {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
  moderatorId: string;
  moderator: {
    id: string;
    username: string;
  };
  type: ActionType;
  reason: string;
  duration?: number;
  postId?: string;
  commentId?: string;
  appealable: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// Blocking Types
export interface BlockUserDto {
  blockedUserId: string;
  reason?: string;
}

export interface BlockedUser {
  id: string;
  user: {
    id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
  reason?: string;
  blockedAt: Date;
}

// Muting Types
export interface MuteUserDto {
  mutedUserId: string;
  duration?: number;
}

export interface MutedUser {
  id: string;
  user: {
    id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
  expiresAt?: Date;
  mutedAt: Date;
}

export interface MuteKeywordDto {
  keyword: string;
  caseSensitive?: boolean;
}

export interface MutedKeyword {
  id: string;
  userId: string;
  keyword: string;
  caseSensitive: boolean;
  createdAt: Date;
}

// Appeal Types
export interface CreateAppealDto {
  actionId: string;
  reason: string;
  evidenceUrls?: string[];
}

export interface UpdateAppealDto {
  status: AppealStatus;
  reviewNote: string;
}

export interface QueryAppealsDto {
  status?: AppealStatus;
  page?: number;
  limit?: number;
}

export interface Appeal {
  id: string;
  actionId: string;
  action: ModerationAction;
  userId: string;
  user: {
    id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatarUrl?: string;
    };
  };
  reason: string;
  status: AppealStatus;
  reviewerId?: string;
  reviewNote?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

// Content Filtering Types
export interface ContentFilterDto {
  content: string;
  contentType?: string;
}

export interface FilterResult {
  allowed: boolean;
  action: FilterAction | null;
  matchedRules: string[];
  score: number;
}

export interface CreateContentRuleDto {
  name: string;
  description: string;
  keywords: string[];
  action: FilterAction;
  caseSensitive?: boolean;
  enabled?: boolean;
}

export interface ContentRule {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  action: FilterAction;
  caseSensitive: boolean;
  enabled: boolean;
  createdAt: Date;
}

// Statistics Types
export interface QueueStats {
  total: {
    pending: number;
    underReview: number;
    actionTaken: number;
    dismissed: number;
  };
  byReason: Array<{
    reason: ReportReason;
    _count: number;
  }>;
  averageResolutionTime: number;
}

export interface ModerationStats {
  period: string;
  total: number;
  byType: {
    warnings: number;
    suspensions: number;
    bans: number;
    contentRemovals: number;
  };
  appealRate: number;
}

export interface FilterStats {
  period: string;
  total: number;
  byAction: {
    blocked: number;
    flagged: number;
    hidden: number;
  };
  topRules: Array<{
    rule: string;
    count: number;
  }>;
}
