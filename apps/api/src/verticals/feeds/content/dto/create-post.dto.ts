/**
 * Create Post DTO
 * Validation for creating new posts
 */

import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsUrl,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export type PostType = 'TEXT' | 'IMAGE' | 'VIDEO';
export type PostVisibility = 'PUBLIC' | 'PRIVATE' | 'FOLLOWERS';

export class CreatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  content?: string;

  @IsIn(['TEXT', 'IMAGE', 'VIDEO'])
  @IsOptional()
  type?: PostType = 'TEXT';

  @IsUrl()
  @IsOptional()
  mediaUrl?: string;

  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @IsIn(['PUBLIC', 'PRIVATE', 'FOLLOWERS'])
  @IsOptional()
  visibility?: PostVisibility = 'PUBLIC';

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  hashtags?: string[];
}
