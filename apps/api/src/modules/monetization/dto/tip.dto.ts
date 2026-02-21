import {
  IsString,
  IsNumber,
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

  @IsNumber()
  @Min(0.5) // Minimum 50 cents
  @Max(1000) // Maximum $1000 per tip
  amount: number;

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
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
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
