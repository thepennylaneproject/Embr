import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export enum TipAmountPreset {
  SMALL = 'SMALL', // $1
  MEDIUM = 'MEDIUM', // $5
  LARGE = 'LARGE', // $10
  CUSTOM = 'CUSTOM',
}

export class CreateTipDto {
  @IsUUID()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsOptional()
  postId?: string;

  @IsInt()
  @Min(50) // Minimum $0.50 (50 cents)
  @Max(100000) // Maximum $1000 (100000 cents)
  amountCents: number; // Amount in integer cents (e.g., 500 = $5.00)

  @IsEnum(TipAmountPreset)
  @IsOptional()
  preset?: TipAmountPreset;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  paymentMethodId?: string; // Stripe payment method ID
}

export class GetTipsQueryDto {
  @IsOptional()
  @IsEnum(['sent', 'received'])
  type?: 'sent' | 'received';

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class TipStatsDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
