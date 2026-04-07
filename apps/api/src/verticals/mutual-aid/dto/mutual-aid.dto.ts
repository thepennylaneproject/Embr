import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum MutualAidType {
  REQUEST = 'REQUEST',
  OFFER = 'OFFER',
}

export enum MutualAidCategory {
  FOOD = 'FOOD',
  SHELTER = 'SHELTER',
  TRANSPORTATION = 'TRANSPORTATION',
  CHILDCARE = 'CHILDCARE',
  MEDICAL = 'MEDICAL',
  FINANCIAL = 'FINANCIAL',
  SKILLS = 'SKILLS',
  SUPPLIES = 'SUPPLIES',
  EMOTIONAL_SUPPORT = 'EMOTIONAL_SUPPORT',
  OTHER = 'OTHER',
}

export enum MutualAidUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateMutualAidPostDto {
  @IsEnum(MutualAidType)
  type!: MutualAidType;

  @IsEnum(MutualAidCategory)
  category!: MutualAidCategory;

  @IsString()
  @MinLength(5)
  @MaxLength(150)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  quantity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsEnum(MutualAidUrgency)
  urgency?: MutualAidUrgency;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  groupId?: string;
}

export class UpdateMutualAidPostDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  quantity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsEnum(MutualAidUrgency)
  urgency?: MutualAidUrgency;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class MutualAidSearchDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(MutualAidType)
  type?: MutualAidType;

  @IsOptional()
  @IsEnum(MutualAidCategory)
  category?: MutualAidCategory;

  @IsOptional()
  @IsEnum(MutualAidUrgency)
  urgency?: MutualAidUrgency;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}

export class CreateMutualAidResponseDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message!: string;
}
