import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
  MinLength,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================
// REPORT DTOs
// ============================================

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

export class CreateReportDto {
  @IsEnum(ReportEntityType)
  entityType: ReportEntityType;

  @IsUUID()
  entityId: string;

  @IsEnum(ReportReason)
  reason: ReportReason;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];
}

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  action?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reviewNote?: string;
}

export class QueryReportsDto {
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @IsEnum(ReportEntityType)
  @IsOptional()
  entityType?: ReportEntityType;

  @IsEnum(ReportReason)
  @IsOptional()
  reason?: ReportReason;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// ============================================
// MODERATION ACTION DTOs
// ============================================

export enum ActionType {
  WARNING = 'warning',
  CONTENT_REMOVAL = 'content_removal',
  SUSPENSION = 'suspension',
  BAN = 'ban',
}

export class CreateModerationActionDto {
  @IsUUID()
  userId: string;

  @IsEnum(ActionType)
  type: ActionType;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number; // Duration in days for suspensions

  @IsUUID()
  @IsOptional()
  postId?: string;

  @IsUUID()
  @IsOptional()
  commentId?: string;

  @IsBoolean()
  @IsOptional()
  appealable?: boolean = true;

  @IsBoolean()
  @IsOptional()
  notifyUser?: boolean = true;
}

export class QueryModerationActionsDto {
  @IsEnum(ActionType)
  @IsOptional()
  type?: ActionType;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  activeOnly?: boolean = false;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

// ============================================
// BLOCKING DTOs
// ============================================

export class BlockUserDto {
  @IsUUID()
  blockedUserId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class MuteUserDto {
  @IsUUID()
  mutedUserId: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number; // Duration in hours, null = permanent
}

export class MuteKeywordDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  keyword: string;

  @IsBoolean()
  @IsOptional()
  caseSensitive?: boolean = false;
}

// ============================================
// APPEAL DTOs
// ============================================

export enum AppealStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export class CreateAppealDto {
  @IsUUID()
  actionId: string;

  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  reason: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evidenceUrls?: string[];
}

export class UpdateAppealDto {
  @IsEnum(AppealStatus)
  status: AppealStatus;

  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  reviewNote: string;
}

export class QueryAppealsDto {
  @IsEnum(AppealStatus)
  @IsOptional()
  status?: AppealStatus;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

// ============================================
// CONTENT FILTERING DTOs
// ============================================

export enum FilterAction {
  HIDE = 'hide',
  FLAG = 'flag',
  BLOCK = 'block',
}

export class ContentFilterDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  contentType?: string; // 'post', 'comment', 'message', 'bio'
}

export class CreateContentRuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  keywords: string[];

  @IsEnum(FilterAction)
  action: FilterAction;

  @IsBoolean()
  @IsOptional()
  caseSensitive?: boolean = false;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;
}

// ============================================
// SAFETY SETTINGS DTOs
// ============================================

export class UpdateSafetySettingsDto {
  @IsBoolean()
  @IsOptional()
  hideNsfw?: boolean;

  @IsBoolean()
  @IsOptional()
  hideSensitiveContent?: boolean;

  @IsBoolean()
  @IsOptional()
  allowDmsFromEveryone?: boolean;

  @IsBoolean()
  @IsOptional()
  allowTaggingFromEveryone?: boolean;

  @IsBoolean()
  @IsOptional()
  showOnlineStatus?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mutedKeywords?: string[];
}
