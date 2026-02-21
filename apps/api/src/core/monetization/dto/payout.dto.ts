import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export class CreatePayoutRequestDto {
  @IsNumber()
  @Min(10) // Minimum $10 payout
  amount: number;

  @IsString()
  @IsOptional()
  note?: string;
}

export class ApprovePayoutDto {
  @IsUUID()
  @IsNotEmpty()
  payoutRequestId: string;

  @IsBoolean()
  @IsOptional()
  approve?: boolean = true;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class GetPayoutsQueryDto {
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ProcessPayoutDto {
  @IsUUID()
  @IsNotEmpty()
  payoutId: string;

  @IsString()
  @IsNotEmpty()
  stripePayoutId: string;
}
