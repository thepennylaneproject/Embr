import { IsOptional, IsString, IsInt, Min, IsEnum, IsBoolean, IsArray } from 'class-validator';

export enum UserSearchSortBy {
  RELEVANCE = 'relevance',
  FOLLOWERS = 'followers',
  RECENT = 'recent',
  ENGAGEMENT = 'engagement',
}

export enum AvailabilityFilter {
  AVAILABLE = 'available',
  BUSY = 'busy',
  ANY = 'any',
}

export class SearchUsersDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsEnum(AvailabilityFilter)
  availability?: AvailabilityFilter;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsEnum(UserSearchSortBy)
  sortBy?: UserSearchSortBy = UserSearchSortBy.RELEVANCE;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class GetRecommendedUsersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  context?: 'general' | 'similar_interests' | 'mutual_connections' | 'trending';
}

export class GetTrendingCreatorsDto {
  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  timeframe?: 'day' | 'week' | 'month' = 'week';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class SimilarUsersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
