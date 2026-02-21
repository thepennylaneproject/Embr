/**
 * Thumbnail Generation Service
 * Generates thumbnails for images and video content
 */

import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { S3MultipartService } from './s3-multipart.service';
import { MuxVideoService } from './mux-video.service';
import { v4 as uuidv4 } from 'uuid';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ThumbnailResult {
  thumbnailUrl: string;
  thumbnailKey: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface VideoThumbnailOptions extends ThumbnailOptions {
  time?: number; // Time in seconds to capture thumbnail
  generateMultiple?: boolean; // Generate thumbnails at different timestamps
}

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  // Default thumbnail sizes
  private readonly DEFAULT_SIZES = {
    small: { width: 320, height: 180 },
    medium: { width: 640, height: 360 },
    large: { width: 1280, height: 720 },
  };

  constructor(
    private s3Service: S3MultipartService,
    private muxService: MuxVideoService,
  ) {}

  /**
   * Generate thumbnail from image buffer
   */
  async generateImageThumbnail(
    imageBuffer: Buffer,
    options: ThumbnailOptions = {},
  ): Promise<ThumbnailResult> {
    try {
      const {
        width = 640,
        height = 360,
        quality = 80,
        format = 'jpeg',
        fit = 'cover',
      } = options;

      // Process image with sharp
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(width, height, { fit })
        .toFormat(format, { quality })
        .toBuffer();

      // Get metadata
      const metadata = await sharp(thumbnailBuffer).metadata();

      // Generate unique key for thumbnail
      const thumbnailKey = this.generateThumbnailKey(format);

      // Upload to S3
      const thumbnailUrl = await this.uploadThumbnailToS3(
        thumbnailBuffer,
        thumbnailKey,
        `image/${format}`,
      );

      this.logger.log(`Generated image thumbnail: ${thumbnailKey}`);

      return {
        thumbnailUrl,
        thumbnailKey,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: thumbnailBuffer.length,
      };
    } catch (error) {
      this.logger.error('Failed to generate image thumbnail', error.stack);
      throw error;
    }
  }

  /**
   * Generate multiple thumbnail sizes from image
   */
  async generateImageThumbnailSet(
    imageBuffer: Buffer,
    sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large'],
  ): Promise<Record<string, ThumbnailResult>> {
    const thumbnails: Record<string, ThumbnailResult> = {};

    for (const size of sizes) {
      const dimensions = this.DEFAULT_SIZES[size];
      const thumbnail = await this.generateImageThumbnail(imageBuffer, {
        width: dimensions.width,
        height: dimensions.height,
        format: 'jpeg',
        quality: 85,
      });

      thumbnails[size] = thumbnail;
    }

    this.logger.log(`Generated ${sizes.length} thumbnail sizes`);

    return thumbnails;
  }

  /**
   * Generate thumbnail from Mux video
   */
  async generateVideoThumbnail(
    muxPlaybackId: string,
    options: VideoThumbnailOptions = {},
  ): Promise<ThumbnailResult> {
    try {
      const {
        width = 640,
        height = 360,
        time = 0,
        format = 'jpeg',
        quality = 85,
      } = options;

      // Get thumbnail URL from Mux
      const muxThumbnailUrl = this.muxService.getThumbnailUrl(muxPlaybackId, {
        width,
        height,
        time,
        fitMode: 'smartcrop',
      });

      // Fetch the thumbnail from Mux
      const response = await fetch(muxThumbnailUrl);
      const arrayBuffer = await response.arrayBuffer();
      const thumbnailBuffer = Buffer.from(arrayBuffer);

      // Optionally process with sharp for additional optimization
      const processedBuffer = await sharp(thumbnailBuffer)
        .toFormat(format, { quality })
        .toBuffer();

      // Get metadata
      const metadata = await sharp(processedBuffer).metadata();

      // Generate unique key for thumbnail
      const thumbnailKey = this.generateThumbnailKey(format, 'video');

      // Upload to S3
      const thumbnailUrl = await this.uploadThumbnailToS3(
        processedBuffer,
        thumbnailKey,
        `image/${format}`,
      );

      this.logger.log(
        `Generated video thumbnail from Mux playback: ${muxPlaybackId}`,
      );

      return {
        thumbnailUrl,
        thumbnailKey,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: processedBuffer.length,
      };
    } catch (error) {
      this.logger.error('Failed to generate video thumbnail', error.stack);
      throw error;
    }
  }

  /**
   * Generate multiple thumbnails at different timestamps
   */
  async generateVideoThumbnailTimeline(
    muxPlaybackId: string,
    duration: number,
    count: number = 5,
    options: ThumbnailOptions = {},
  ): Promise<ThumbnailResult[]> {
    const thumbnails: ThumbnailResult[] = [];
    const interval = duration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const time = Math.floor(interval * i);
      const thumbnail = await this.generateVideoThumbnail(muxPlaybackId, {
        ...options,
        time,
      });
      thumbnails.push(thumbnail);
    }

    this.logger.log(
      `Generated ${count} timeline thumbnails for video ${muxPlaybackId}`,
    );

    return thumbnails;
  }

  /**
   * Generate animated GIF preview from video
   */
  async generateVideoGifPreview(
    muxPlaybackId: string,
    options?: {
      width?: number;
      height?: number;
      fps?: number;
      start?: number;
      end?: number;
    },
  ): Promise<string> {
    try {
      const gifUrl = this.muxService.getAnimatedGifUrl(muxPlaybackId, options);

      // Optionally download and re-upload to S3 for CDN serving
      // For now, return the Mux-hosted GIF URL directly
      this.logger.log(`Generated GIF preview URL for ${muxPlaybackId}`);

      return gifUrl;
    } catch (error) {
      this.logger.error('Failed to generate video GIF preview', error.stack);
      throw error;
    }
  }

  /**
   * Extract dominant colors from image
   */
  async extractDominantColors(
    imageBuffer: Buffer,
    count: number = 5,
  ): Promise<string[]> {
    try {
      // Resize to small size for faster processing
      const smallImage = await sharp(imageBuffer)
        .resize(100, 100, { fit: 'cover' })
        .toBuffer();

      const { dominant } = await sharp(smallImage).stats();

      // Convert RGB to hex
      const hexColor = `#${dominant.r.toString(16).padStart(2, '0')}${dominant.g.toString(16).padStart(2, '0')}${dominant.b.toString(16).padStart(2, '0')}`;

      // For now, return single dominant color
      // In production, use a color quantization library for multiple colors
      return [hexColor];
    } catch (error) {
      this.logger.error('Failed to extract dominant colors', error.stack);
      throw error;
    }
  }

  /**
   * Generate blur placeholder (LQIP - Low Quality Image Placeholder)
   */
  async generateBlurPlaceholder(imageBuffer: Buffer): Promise<string> {
    try {
      // Generate tiny blurred version
      const placeholder = await sharp(imageBuffer)
        .resize(20, 20, { fit: 'cover' })
        .blur(10)
        .jpeg({ quality: 10 })
        .toBuffer();

      // Convert to base64 data URL
      const base64 = placeholder.toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      this.logger.error('Failed to generate blur placeholder', error.stack);
      throw error;
    }
  }

  /**
   * Validate image dimensions and file size
   */
  async validateImage(
    imageBuffer: Buffer,
    maxWidth: number = 4096,
    maxHeight: number = 4096,
    maxSizeMB: number = 10,
  ): Promise<{
    valid: boolean;
    width?: number;
    height?: number;
    size?: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const metadata = await sharp(imageBuffer).metadata();
      const sizeMB = imageBuffer.length / (1024 * 1024);

      if (metadata.width > maxWidth) {
        errors.push(`Image width ${metadata.width}px exceeds maximum ${maxWidth}px`);
      }

      if (metadata.height > maxHeight) {
        errors.push(
          `Image height ${metadata.height}px exceeds maximum ${maxHeight}px`,
        );
      }

      if (sizeMB > maxSizeMB) {
        errors.push(
          `Image size ${sizeMB.toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`,
        );
      }

      return {
        valid: errors.length === 0,
        width: metadata.width,
        height: metadata.height,
        size: imageBuffer.length,
        errors,
      };
    } catch (error) {
      errors.push('Invalid image format');
      return {
        valid: false,
        errors,
      };
    }
  }

  /**
   * Upload thumbnail to S3
   */
  private async uploadThumbnailToS3(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    // For small thumbnails, use simple put
    // In production, integrate with S3MultipartService
    // For now, this is a placeholder that would use your S3 upload logic

    // Simulating S3 upload - replace with actual S3MultipartService call
    const fileUrl = `https://your-bucket.s3.amazonaws.com/${key}`;

    return fileUrl;
  }

  /**
   * Generate unique thumbnail key
   */
  private generateThumbnailKey(
    format: string,
    prefix: string = 'image',
  ): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    return `thumbnails/${prefix}/${year}/${month}/${uuid}-${timestamp}.${format}`;
  }
}
