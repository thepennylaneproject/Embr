/**
 * Media Service
 * Handles database operations for media records
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMediaRecordDto,
  UpdateMediaMuxDataDto,
} from '../dto/media-upload.dto';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create new media record
   */
  async createMediaRecord(dto: CreateMediaRecordDto) {
    try {
      const media = await this.prisma.media.create({
        data: {
          userId: dto.userId,
          fileName: dto.fileName,
          fileType: dto.fileType,
          fileSize: dto.fileSize,
          contentType: dto.contentType,
          uploadId: dto.uploadId,
          fileKey: dto.fileKey,
          fileUrl: dto.fileUrl,
          thumbnailUrl: dto.thumbnailUrl,
          thumbnailKey: dto.thumbnailKey,
          muxAssetId: dto.muxAssetId,
          muxPlaybackId: dto.muxPlaybackId,
          status: dto.status,
        },
      });

      this.logger.log(`Created media record: ${media.id}`);

      return media;
    } catch (error) {
      this.logger.error('Failed to create media record', error.stack);
      throw error;
    }
  }

  /**
   * Get media by ID
   */
  async getMediaById(mediaId: string) {
    return this.prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get media by upload ID
   */
  async getMediaByUploadId(uploadId: string) {
    return this.prisma.media.findFirst({
      where: { uploadId },
    });
  }

  /**
   * Get media by Mux asset ID
   */
  async getMediaByMuxAssetId(assetId: string) {
    return this.prisma.media.findFirst({
      where: { muxAssetId: assetId },
    });
  }

  /**
   * Get media by file key
   */
  async getMediaByFileKey(fileKey: string) {
    return this.prisma.media.findFirst({
      where: { fileKey },
    });
  }

  /**
   * Get user's media
   */
  async getUserMedia(
    userId: string,
    options?: {
      contentType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { contentType, status, limit = 20, offset = 0 } = options || {};

    const where: any = {
      userId,
      deletedAt: null,
    };

    if (contentType) {
      where.contentType = contentType;
    }

    if (status) {
      where.status = status;
    }

    const [media, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.media.count({ where }),
    ]);

    return {
      media,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Update media status
   */
  async updateMediaStatus(
    mediaId: string,
    status: string,
    metadata?: {
      errorMessage?: string;
      completedAt?: Date;
    },
  ) {
    try {
      const updateData: any = { status };

      if (metadata?.errorMessage) {
        updateData.errorMessage = metadata.errorMessage;
      }

      if (metadata?.completedAt) {
        updateData.completedAt = metadata.completedAt;
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      const media = await this.prisma.media.update({
        where: { id: mediaId },
        data: updateData,
      });

      this.logger.log(`Updated media ${mediaId} status to ${status}`);

      return media;
    } catch (error) {
      this.logger.error(
        `Failed to update media status for ${mediaId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update media with Mux data
   */
  async updateMediaWithMuxData(mediaId: string, dto: UpdateMediaMuxDataDto) {
    try {
      const media = await this.prisma.media.update({
        where: { id: mediaId },
        data: {
          muxAssetId: dto.muxAssetId,
          muxPlaybackId: dto.muxPlaybackId,
          playbackUrl: dto.playbackUrl,
          thumbnailUrl: dto.thumbnailUrl,
          thumbnailKey: dto.thumbnailKey,
          duration: dto.duration,
          aspectRatio: dto.aspectRatio,
          status: dto.status,
          completedAt: dto.completedAt,
        },
      });

      this.logger.log(`Updated media ${mediaId} with Mux data`);

      return media;
    } catch (error) {
      this.logger.error(
        `Failed to update media with Mux data for ${mediaId}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update media
   */
  async updateMedia(mediaId: string, data: any) {
    try {
      const media = await this.prisma.media.update({
        where: { id: mediaId },
        data,
      });

      this.logger.log(`Updated media ${mediaId}`);

      return media;
    } catch (error) {
      this.logger.error(`Failed to update media ${mediaId}`, error.stack);
      throw error;
    }
  }

  /**
   * Soft delete media
   */
  async deleteMedia(mediaId: string) {
    try {
      const media = await this.prisma.media.update({
        where: { id: mediaId },
        data: {
          deletedAt: new Date(),
          status: 'deleted',
        },
      });

      this.logger.log(`Soft deleted media ${mediaId}`);

      return media;
    } catch (error) {
      this.logger.error(`Failed to delete media ${mediaId}`, error.stack);
      throw error;
    }
  }

  /**
   * Hard delete media (cleanup job)
   */
  async hardDeleteMedia(mediaId: string) {
    try {
      await this.prisma.media.delete({
        where: { id: mediaId },
      });

      this.logger.log(`Hard deleted media ${mediaId}`);
    } catch (error) {
      this.logger.error(`Failed to hard delete media ${mediaId}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if user has access to media
   */
  async checkMediaAccess(userId: string, mediaId: string): Promise<boolean> {
    const media = (await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: {
        userId: true,
        post: {
          select: {
            id: true,
            authorId: true,
            visibility: true,
          },
        },
      },
    }) as any);

    if (!media) {
      return false;
    }

    // Owner has access
    if (media.userId === userId) {
      return true;
    }

    // Check if media is attached to a public post
    if (media.post && media.post.visibility === 'public') {
      return true;
    }

    // Check if user is following the content creator (implement your logic)
    // For now, return false
    return false;
  }

  /**
   * Get media statistics for user
   */
  async getMediaStats(userId: string) {
    const [totalCount, totalSize, byType, byStatus] = await Promise.all([
      this.prisma.media.count({
        where: { userId, deletedAt: null },
      }),
      this.prisma.media.aggregate({
        where: { userId, deletedAt: null },
        _sum: { fileSize: true },
      }),
      this.prisma.media.groupBy({
        by: ['contentType'],
        where: { userId, deletedAt: null },
        _count: true,
      }),
      this.prisma.media.groupBy({
        by: ['status'],
        where: { userId, deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      totalFiles: totalCount,
      totalSize: totalSize._sum.fileSize || 0,
      byType: byType.map((t) => ({
        type: t.contentType,
        count: t._count,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  }

  /**
   * Clean up old deleted media (cron job)
   */
  async cleanupDeletedMedia(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const deletedMedia = await this.prisma.media.findMany({
      where: {
        deletedAt: {
          lte: cutoffDate,
        },
      },
      select: {
        id: true,
        fileKey: true,
        thumbnailKey: true,
        muxAssetId: true,
      },
    });

    this.logger.log(`Found ${deletedMedia.length} media to cleanup`);

    // Return list for external cleanup (S3, Mux)
    return deletedMedia;
  }

  /**
   * Get failed uploads for retry
   */
  async getFailedUploads(userId: string, limit: number = 10) {
    return this.prisma.media.findMany({
      where: {
        userId,
        status: 'error',
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
