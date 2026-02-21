/**
 * Media Upload DTOs
 * Data transfer objects for media upload endpoints
 */

import { IsString, IsNumber, IsEnum, IsArray, ValidateNested, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ContentType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export enum UploadStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  ABORTED = 'aborted',
  CANCELLED = 'cancelled',
  DELETED = 'deleted',
}

/**
 * Initiate Upload DTO
 */
export class InitiateUploadDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'vacation-video.mp4',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'video/mp4',
  })
  @IsString()
  fileType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 52428800,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  fileSize: number;

  @ApiProperty({
    description: 'Content type category',
    enum: ContentType,
    example: ContentType.VIDEO,
  })
  @IsEnum(ContentType)
  contentType: ContentType;
}

/**
 * Complete Simple Upload DTO
 */
export class CompleteUploadDto {
  @ApiProperty({
    description: 'File key in S3',
    example: 'videos/2024/11/abc123-1700000000.mp4',
  })
  @IsString()
  fileKey: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'vacation-video.mp4',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'Content type category',
    enum: ContentType,
  })
  @IsEnum(ContentType)
  contentType: ContentType;
}

/**
 * Upload Part DTO (for multipart uploads)
 */
export class UploadPartDto {
  @ApiProperty({
    description: 'Part number (1-indexed)',
    example: 1,
    minimum: 1,
    maximum: 10000,
  })
  @IsNumber()
  @Min(1)
  @Max(10000)
  PartNumber: number;

  @ApiProperty({
    description: 'ETag returned from S3 after part upload',
    example: '"abc123def456"',
  })
  @IsString()
  ETag: string;
}

/**
 * Complete Multipart Upload DTO
 */
export class CompleteMultipartUploadDto {
  @ApiProperty({
    description: 'Multipart upload ID',
    example: 'abc123def456',
  })
  @IsString()
  uploadId: string;

  @ApiProperty({
    description: 'File key in S3',
    example: 'videos/2024/11/abc123-1700000000.mp4',
  })
  @IsString()
  fileKey: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'vacation-video.mp4',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'Content type category',
    enum: ContentType,
  })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiProperty({
    description: 'Array of uploaded parts with ETags',
    type: [UploadPartDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadPartDto)
  parts: UploadPartDto[];
}

/**
 * Abort Upload DTO
 */
export class AbortUploadDto {
  @ApiProperty({
    description: 'Upload ID',
    example: 'abc123def456',
  })
  @IsString()
  uploadId: string;

  @ApiProperty({
    description: 'Type of upload to abort',
    enum: ['simple', 'multipart', 'mux'],
    example: 'multipart',
  })
  @IsEnum(['simple', 'multipart', 'mux'])
  uploadType: 'simple' | 'multipart' | 'mux';

  @ApiProperty({
    description: 'File key (for multipart uploads)',
    example: 'videos/2024/11/abc123-1700000000.mp4',
    required: false,
  })
  @IsOptional()
  @IsString()
  fileKey?: string;
}

/**
 * Generate Thumbnail DTO
 */
export class GenerateThumbnailDto {
  @ApiProperty({
    description: 'Media ID to generate thumbnail for',
    example: 'media_abc123',
  })
  @IsString()
  mediaId: string;

  @ApiProperty({
    description: 'Thumbnail width in pixels',
    example: 640,
    required: false,
    minimum: 100,
    maximum: 4096,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4096)
  width?: number;

  @ApiProperty({
    description: 'Thumbnail height in pixels',
    example: 360,
    required: false,
    minimum: 100,
    maximum: 4096,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4096)
  height?: number;

  @ApiProperty({
    description: 'Time in seconds for video thumbnail',
    example: 5,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  time?: number;
}

/**
 * Get Signed URL DTO
 */
export class GetSignedUrlDto {
  @ApiProperty({
    description: 'Expiration time in seconds',
    example: 3600,
    required: false,
    minimum: 60,
    maximum: 604800,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(604800)
  expiresIn?: number;
}

/**
 * Create Media Record DTO (internal use)
 */
export interface CreateMediaRecordDto {
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  contentType: string;
  uploadId?: string;
  fileKey?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  status: string;
}

/**
 * Update Media with Mux Data DTO (internal use)
 */
export interface UpdateMediaMuxDataDto {
  muxAssetId: string;
  muxPlaybackId: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  duration?: number;
  aspectRatio?: string;
  status: string;
  completedAt: Date;
}
