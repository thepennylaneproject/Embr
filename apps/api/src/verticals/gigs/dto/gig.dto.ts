import {
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
  Max,
  IsDate,
  IsUrl,
  ArrayMinSize,
  MinLength,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  GigCategory,
  GigBudgetType,
  GigExperienceLevel,
  GigStatus,
  ApplicationStatus,
  MilestoneStatus,
} from '../../../shared/types/gig.types';

// ============================================================================
// GIG DTOs
// ============================================================================

export class CreateGigDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  description: string;

  @IsEnum(GigCategory)
  category: GigCategory;

  @IsEnum(GigBudgetType)
  budgetType: GigBudgetType;

  @IsNumber()
  @Min(1)
  budgetMin: number;

  @IsNumber()
  @Min(1)
  budgetMax: number;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsEnum(GigExperienceLevel)
  experienceLevel: GigExperienceLevel;

  @IsInt()
  @Min(1)
  @Max(365)
  estimatedDuration: number;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  skills: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  deliverables: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date;
}

export class UpdateGigDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @IsEnum(GigCategory)
  @IsOptional()
  category?: GigCategory;

  @IsEnum(GigBudgetType)
  @IsOptional()
  budgetType?: GigBudgetType;

  @IsNumber()
  @Min(1)
  @IsOptional()
  budgetMin?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  budgetMax?: number;

  @IsEnum(GigExperienceLevel)
  @IsOptional()
  experienceLevel?: GigExperienceLevel;

  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  estimatedDuration?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deliverables?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsEnum(GigStatus)
  @IsOptional()
  status?: GigStatus;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date;
}

export class GigSearchDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsEnum(GigCategory)
  @IsOptional()
  category?: GigCategory;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  budgetMin?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  budgetMax?: number;

  @IsEnum(GigBudgetType)
  @IsOptional()
  budgetType?: GigBudgetType;

  @IsEnum(GigExperienceLevel)
  @IsOptional()
  experienceLevel?: GigExperienceLevel;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  sortBy?: 'recent' | 'budget_high' | 'budget_low' | 'deadline';

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

// ============================================================================
// APPLICATION DTOs
// ============================================================================

export class MilestoneProposalDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  description: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsInt()
  @Min(1)
  @Max(365)
  estimatedDays: number;
}

export class CreateApplicationDto {
  @IsString()
  gigId: string;

  @IsString()
  @MinLength(100)
  @MaxLength(2000)
  coverLetter: string;

  @IsNumber()
  @Min(1)
  proposedBudget: number;

  @IsInt()
  @Min(1)
  @Max(365)
  proposedTimeline: number;

  @IsArray()
  @IsUrl({}, { each: true })
  portfolioLinks: string[];

  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  relevantExperience: string;

  @IsArray()
  @Type(() => MilestoneProposalDto)
  @IsOptional()
  milestones?: MilestoneProposalDto[];
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

// ============================================================================
// MILESTONE DTOs
// ============================================================================

export class CreateMilestoneDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  description: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @IsInt()
  @Min(0)
  order: number;
}

export class UpdateMilestoneDto {
  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @IsOptional()
  feedback?: string;
}

// ============================================================================
// ESCROW DTOs
// ============================================================================

export class FundEscrowDto {
  @IsString()
  stripePaymentMethodId: string;
}

export class ReleaseMilestoneDto {
  @IsString()
  milestoneId: string;
}

// ============================================================================
// DISPUTE DTOs
// ============================================================================

export class RaiseDisputeDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  reason: string;

  @IsString()
  @MinLength(50)
  @MaxLength(2000)
  description: string;

  @IsArray()
  @IsString({ each: true })
  evidence: string[];
}

// ============================================================================
// REVIEW DTOs
// ============================================================================

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  comment: string;

  @IsInt()
  @Min(1)
  @Max(5)
  professionalism: number;

  @IsInt()
  @Min(1)
  @Max(5)
  communication: number;

  @IsInt()
  @Min(1)
  @Max(5)
  quality: number;

  @IsInt()
  @Min(1)
  @Max(5)
  timeliness: number;
}
