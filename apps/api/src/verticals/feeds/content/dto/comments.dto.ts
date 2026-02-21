/**
 * Comment DTOs
 * Data Transfer Objects for comment operations
 */

import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'Great post! Really enjoyed this.',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(500, { message: 'Comment must be less than 500 characters' })
  content: string;

  @ApiPropertyOptional({
    description: 'Parent comment ID for nested replies',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Parent ID must be a valid UUID' })
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Updated comment content',
    example: 'Great post! Really enjoyed this. (edited)',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(500, { message: 'Comment must be less than 500 characters' })
  content: string;
}

export class CommentQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of comments per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Parent comment ID to filter replies',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}
