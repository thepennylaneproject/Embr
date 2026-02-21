import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export enum TransactionType {
  TIP = 'TIP',
  GIG_PAYMENT = 'GIG_PAYMENT',
  GIG_REFUND = 'GIG_REFUND',
  WITHDRAWAL = 'WITHDRAWAL',
  DEPOSIT = 'DEPOSIT',
  REFERRAL_REWARD = 'REFERRAL_REWARD',
  SUBSCRIPTION = 'SUBSCRIPTION',
  AD_PAYMENT = 'AD_PAYMENT',
  PLATFORM_FEE = 'PLATFORM_FEE',
}

export class GetTransactionsQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

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

export class CreateStripeConnectAccountDto {
  @IsString()
  @IsNotEmpty()
  country: string = 'US';

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsBoolean()
  @IsOptional()
  agreesToTerms?: boolean = false;
}

export class CompleteStripeOnboardingDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;
}

export class GetStripeAccountLinkDto {
  @IsString()
  @IsNotEmpty()
  refreshUrl: string;

  @IsString()
  @IsNotEmpty()
  returnUrl: string;
}

export class WalletBalanceDto {
  available: number;
  pending: number;
  total: number;
  currency: string;
}
