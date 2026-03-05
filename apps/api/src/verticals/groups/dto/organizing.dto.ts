import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';

// ─── Action Alerts ────────────────────────────────────────────────────────────

export enum AlertUrgency {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export class CreateAlertDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  body: string;

  @IsOptional()
  @IsEnum(AlertUrgency)
  urgency?: AlertUrgency;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  ctaText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

// ─── Polls ────────────────────────────────────────────────────────────────────

export class CreatePollDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  question: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  options: string[];

  @IsOptional()
  @IsBoolean()
  multiSelect?: boolean;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class VoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  optionIds: string[];
}

// ─── Treasury ─────────────────────────────────────────────────────────────────

export class ContributeDto {
  @IsInt()
  @Min(100) // minimum $1.00
  amount: number; // cents

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;
}

export class DisburseDto {
  @IsInt()
  @Min(1)
  amount: number; // cents

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  purpose: string;

  @IsOptional()
  @IsString()
  pollId?: string;
}
