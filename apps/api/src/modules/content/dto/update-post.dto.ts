/**
 * Update Post DTO
 * Validation for updating existing posts
 */

import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { PostVisibility } from './create-post.dto';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  content?: string;

  @IsIn(['PUBLIC', 'PRIVATE', 'FOLLOWERS'])
  @IsOptional()
  visibility?: PostVisibility;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  hashtags?: string[];
}
