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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ListingType {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  BUNDLE = 'BUNDLE',
}

export enum ListingCondition {
  NEW = 'NEW',
  LIKE_NEW = 'LIKE_NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}

export class CreateListingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @IsInt()
  @Min(1)
  price: number;

  @IsEnum(ListingType)
  type: ListingType;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsString()
  @MaxLength(100)
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  images?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  allowOffers?: boolean;

  @IsOptional()
  @IsBoolean()
  isShippable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  price?: number;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  images?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  allowOffers?: boolean;

  @IsOptional()
  @IsBoolean()
  isShippable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export class ListingSearchDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ListingCondition)
  condition?: ListingCondition;

  @IsOptional()
  minPrice?: number;

  @IsOptional()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}

export class CreateOrderDto {
  @IsString()
  listingId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CheckoutCartItemDto {
  @IsString()
  listingId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class CreateCheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutCartItemDto)
  items: CheckoutCartItemDto[];

  @IsOptional()
  shippingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class CreateOfferDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
