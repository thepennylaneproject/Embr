/**
 * Media Upload Controller
 * Handles file upload initialization, progress, and completion
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { S3MultipartService } from '../services/s3-multipart.service';
import { MuxVideoService } from '../services/mux-video.service';
import { ThumbnailService } from '../services/thumbnail.service';
import { MediaService } from '../services/media.service';
import {
  InitiateUploadDto,
  CompleteUploadDto,
  CompleteMultipartUploadDto,
  AbortUploadDto,
} from '../dto/media-upload.dto';

@ApiTags('Media Upload')
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaUploadController {
  private readonly logger = new Logger(MediaUploadController.name);

  constructor(
    private s3Service: S3MultipartService,
    private muxService: MuxVideoService,
    private thumbnailService: ThumbnailService,
    private mediaService: MediaService,
  ) {}

  /**
   * Initiate upload - determines if multipart is needed
   */
  @Post('upload/initiate')
  @ApiOperation({ summary: 'Initiate media upload' })
  @ApiResponse({ status: 200, description: 'Upload initialized' })
  async initiateUpload(
    @CurrentUser() user: any,
    @Body() dto: InitiateUploadDto,
  ) {
    this.logger.log(
      `Initiating upload for user ${user.id}: ${dto.fileName} (${dto.fileSize} bytes)`,
    );

    // Validate file type
    this.validateFileType(dto.fileType, dto.contentType);

    // Determine if multipart upload is needed
    const useMultipart = this.s3Service.shouldUseMultipart(dto.fileSize);

    if (useMultipart && dto.contentType === 'video') {
      // For large videos, use Mux direct upload
      return this.initiateMuxUpload(user.id, dto);
    } else if (useMultipart) {
      // For large non-video files, use S3 multipart
      return this.initiateS3MultipartUpload(user.id, dto);
    } else {
      // For small files, use simple presigned URL
      return this.initiateSimpleUpload(user.id, dto);
    }
  }

  /**
   * Initiate simple upload (< 5MB)
   */
  private async initiateSimpleUpload(userId: string, dto: InitiateUploadDto) {
    const presignedResult = await this.s3Service.getPresignedUploadUrl(
      dto.fileName,
      dto.fileType,
      dto.contentType,
      3600, // 1 hour expiry
    );

    return {
      uploadType: 'simple',
      uploadId: presignedResult.uploadId,
      uploadUrl: presignedResult.uploadUrl,
      fileKey: presignedResult.fileKey,
      expiresIn: presignedResult.expiresIn,
    };
  }

  /**
   * Initiate S3 multipart upload (5MB+)
   */
  private async initiateS3MultipartUpload(
    userId: string,
    dto: InitiateUploadDto,
  ) {
    const multipartResult = await this.s3Service.initializeMultipartUpload(
      dto.fileName,
      dto.fileType,
      dto.fileSize,
      dto.contentType,
    );

    // Generate presigned URLs for all parts
    const partUrls = await this.s3Service.getPresignedPartUrls(
      multipartResult.fileKey,
      multipartResult.uploadId,
      multipartResult.totalParts,
      3600, // 1 hour expiry
    );

    return {
      uploadType: 'multipart',
      uploadId: multipartResult.uploadId,
      fileKey: multipartResult.fileKey,
      partSize: multipartResult.partSize,
      totalParts: multipartResult.totalParts,
      partUrls: partUrls.partUrls,
    };
  }

  /**
   * Initiate Mux upload for videos
   */
  private async initiateMuxUpload(userId: string, dto: InitiateUploadDto) {
    const muxResult = await this.muxService.createDirectUpload('*', {
      playbackPolicy: ['public'],
      mp4Support: 'standard',
      normalizeAudio: true,
      maxResolution: 'high',
    });

    // Create media record in database
    await this.mediaService.createMediaRecord({
      userId,
      fileName: dto.fileName,
      fileType: dto.fileType,
      fileSize: dto.fileSize,
      contentType: dto.contentType,
      uploadId: muxResult.uploadId,
      status: 'uploading',
    });

    return {
      uploadType: 'mux',
      uploadId: muxResult.uploadId,
      uploadUrl: muxResult.uploadUrl,
      assetId: muxResult.assetId,
    };
  }

  /**
   * Complete simple upload
   */
  @Post('upload/complete')
  @ApiOperation({ summary: 'Complete simple upload' })
  @ApiResponse({ status: 200, description: 'Upload completed' })
  async completeUpload(
    @CurrentUser() user: any,
    @Body() dto: CompleteUploadDto,
  ) {
    this.logger.log(`Completing upload for user ${user.id}: ${dto.fileKey}`);

    // Verify file exists in S3
    const exists = await this.s3Service.fileExists(dto.fileKey);
    if (!exists) {
      throw new HttpException('File not found in storage', HttpStatus.NOT_FOUND);
    }

    // Get file metadata
    const metadata = await this.s3Service.getFileMetadata(dto.fileKey);

    // Generate thumbnail if image
    let thumbnail = null;
    if (dto.contentType === 'image') {
      // For images, download and generate thumbnail
      // This is a simplified version - in production, use a queue
      thumbnail = await this.generateImageThumbnail(dto.fileKey);
    }

    // Create media record
    const media = await this.mediaService.createMediaRecord({
      userId: user.id,
      fileName: dto.fileName,
      fileType: metadata.contentType,
      fileSize: metadata.size,
      contentType: dto.contentType,
      fileKey: dto.fileKey,
      fileUrl: this.getFileUrl(dto.fileKey),
      thumbnailUrl: thumbnail?.thumbnailUrl,
      status: 'completed',
    });

    return {
      success: true,
      media,
    };
  }

  /**
   * Complete multipart upload
   */
  @Post('upload/complete-multipart')
  @ApiOperation({ summary: 'Complete multipart upload' })
  @ApiResponse({ status: 200, description: 'Multipart upload completed' })
  async completeMultipartUpload(
    @CurrentUser() user: any,
    @Body() dto: CompleteMultipartUploadDto,
  ) {
    this.logger.log(
      `Completing multipart upload for user ${user.id}: ${dto.fileKey}`,
    );

    // Complete S3 multipart upload
    const result = await this.s3Service.completeMultipartUpload(
      dto.fileKey,
      dto.uploadId,
      dto.parts,
    );

    // Get file metadata
    const metadata = await this.s3Service.getFileMetadata(dto.fileKey);

    // Generate thumbnail if image
    let thumbnail = null;
    if (dto.contentType === 'image') {
      thumbnail = await this.generateImageThumbnail(dto.fileKey);
    }

    // Create or update media record
    const media = await this.mediaService.createMediaRecord({
      userId: user.id,
      fileName: dto.fileName,
      fileType: metadata.contentType,
      fileSize: metadata.size,
      contentType: dto.contentType,
      fileKey: dto.fileKey,
      fileUrl: result.fileUrl,
      thumbnailUrl: thumbnail?.thumbnailUrl,
      status: 'completed',
    });

    return {
      success: true,
      media,
    };
  }

  /**
   * Abort upload
   */
  @Post('upload/abort')
  @ApiOperation({ summary: 'Abort upload' })
  @ApiResponse({ status: 200, description: 'Upload aborted' })
  async abortUpload(@CurrentUser() user: any, @Body() dto: AbortUploadDto) {
    this.logger.log(`Aborting upload for user ${user.id}: ${dto.uploadId}`);

    if (dto.uploadType === 'multipart') {
      await this.s3Service.abortMultipartUpload(dto.fileKey, dto.uploadId);
    }

    // Update media record status
    await this.mediaService.updateMediaStatus(dto.uploadId, 'aborted');

    return {
      success: true,
      message: 'Upload aborted',
    };
  }

  /**
   * Get upload status
   */
  @Get('upload/:uploadId/status')
  @ApiOperation({ summary: 'Get upload status' })
  @ApiResponse({ status: 200, description: 'Upload status retrieved' })
  async getUploadStatus(
    @CurrentUser() user: any,
    @Param('uploadId') uploadId: string,
  ) {
    const media = await this.mediaService.getMediaByUploadId(uploadId);

    if (!media || media.userId !== user.id) {
      throw new HttpException('Upload not found', HttpStatus.NOT_FOUND);
    }

    return {
      uploadId: media.uploadId,
      status: media.status,
      fileUrl: media.fileUrl,
      thumbnailUrl: media.thumbnailUrl,
      createdAt: media.createdAt,
      completedAt: media.completedAt,
    };
  }

  /**
   * Delete media
   */
  @Delete(':mediaId')
  @ApiOperation({ summary: 'Delete media' })
  @ApiResponse({ status: 200, description: 'Media deleted' })
  async deleteMedia(
    @CurrentUser() user: any,
    @Param('mediaId') mediaId: string,
  ) {
    const media = await this.mediaService.getMediaById(mediaId);

    if (!media || media.userId !== user.id) {
      throw new HttpException('Media not found', HttpStatus.FORBIDDEN);
    }

    // Delete from S3
    if (media.fileKey) {
      await this.s3Service.deleteFile(media.fileKey);
    }

    // Delete from Mux if video
    if (media.muxAssetId) {
      await this.muxService.deleteAsset(media.muxAssetId);
    }

    // Delete thumbnail
    if (media.thumbnailKey) {
      await this.s3Service.deleteFile(media.thumbnailKey);
    }

    // Soft delete media record
    await this.mediaService.deleteMedia(mediaId);

    return {
      success: true,
      message: 'Media deleted',
    };
  }

  /**
   * Get signed URL for private content
   */
  @Get(':mediaId/signed-url')
  @ApiOperation({ summary: 'Get signed URL for private media' })
  @ApiResponse({ status: 200, description: 'Signed URL generated' })
  async getSignedUrl(
    @CurrentUser() user: any,
    @Param('mediaId') mediaId: string,
    @Query('expiresIn') expiresIn: number = 3600,
  ) {
    const media = await this.mediaService.getMediaById(mediaId);

    if (!media) {
      throw new HttpException('Media not found', HttpStatus.NOT_FOUND);
    }

    // Check permissions (implement your authorization logic)
    const hasAccess = await this.mediaService.checkMediaAccess(
      user.id,
      mediaId,
    );
    if (!hasAccess) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    let signedUrl: string;

    if (media.muxPlaybackId && media.contentType === 'video') {
      // For Mux videos, create signed playback URL
      signedUrl = await this.muxService.createSignedPlaybackUrl(
        media.muxPlaybackId,
        expiresIn,
      );
    } else if (media.fileKey) {
      // For S3 files, create signed URL
      signedUrl = await this.s3Service.getSignedUrl(media.fileKey, expiresIn);
    } else {
      throw new HttpException('Media not available', HttpStatus.NOT_FOUND);
    }

    return {
      signedUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  /**
   * Helper: Validate file type
   */
  private validateFileType(fileType: string, contentType: string): void {
    const allowedTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      video: [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
      ],
      document: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    };

    if (!allowedTypes[contentType]?.includes(fileType)) {
      throw new HttpException(
        `File type ${fileType} not allowed for ${contentType}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Helper: Generate image thumbnail
   */
  private async generateImageThumbnail(fileKey: string) {
    // This would download the file from S3 and generate thumbnail
    // Simplified for example
    return null;
  }

  /**
   * Helper: Get file URL
   */
  private getFileUrl(fileKey: string): string {
    // This would construct the CDN or S3 URL
    return `https://your-cdn.com/${fileKey}`;
  }
}
