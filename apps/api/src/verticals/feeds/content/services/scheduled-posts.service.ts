/**
 * Scheduled Posts Service
 * Manages post scheduling and automatic publication
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SchedulePostDto {
  content: string;
  type: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  visibility: string;
  hashtags?: string[];
  mentions?: string[];
  scheduledFor: Date;
}

@Injectable()
export class ScheduledPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Schedule a post for future publication
   */
  async schedulePost(userId: string, schedulePostDto: SchedulePostDto) {
    const { content, scheduledFor, ...postData } = schedulePostDto;

    // Validate scheduled time is in the future
    if (new Date(scheduledFor) <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Limit max scheduling to 1 year in advance
    const maxScheduleDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    if (new Date(scheduledFor) > maxScheduleDate) {
      throw new BadRequestException('Cannot schedule more than 1 year in advance');
    }

    const scheduledPost = await this.prisma.scheduledPost.create({
      data: {
        authorId: userId,
        content,
        scheduledFor: new Date(scheduledFor),
        ...postData,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    this.eventEmitter.emit('post.scheduled', {
      scheduledPostId: scheduledPost.id,
      authorId: userId,
      scheduledFor,
    });

    return scheduledPost;
  }

  /**
   * Get user's scheduled posts
   */
  async getUserScheduledPosts(userId: string, params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.scheduledPost.findMany({
        where: {
          authorId: userId,
          status: 'PENDING',
        },
        skip,
        take: limit,
        orderBy: { scheduledFor: 'asc' },
      }),
      this.prisma.scheduledPost.count({
        where: { authorId: userId, status: 'PENDING' },
      }),
    ]);

    return {
      data: posts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a scheduled post
   */
  async updateScheduledPost(
    scheduleId: string,
    userId: string,
    updateData: Partial<SchedulePostDto>,
  ) {
    const scheduled = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduleId },
    });

    if (!scheduled) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (scheduled.authorId !== userId) {
      throw new BadRequestException('You can only edit your own scheduled posts');
    }

    if (scheduled.status !== 'PENDING') {
      throw new BadRequestException('Can only edit pending scheduled posts');
    }

    // Validate new scheduled time if provided
    if (updateData.scheduledFor) {
      if (new Date(updateData.scheduledFor) <= new Date()) {
        throw new BadRequestException('Scheduled time must be in the future');
      }
    }

    const updated = await this.prisma.scheduledPost.update({
      where: { id: scheduleId },
      data: {
        ...(updateData.content && { content: updateData.content }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.mediaUrl !== undefined && { mediaUrl: updateData.mediaUrl }),
        ...(updateData.visibility && { visibility: updateData.visibility }),
        ...(updateData.hashtags && { hashtags: updateData.hashtags }),
        ...(updateData.scheduledFor && { scheduledFor: new Date(updateData.scheduledFor) }),
      },
    });

    return updated;
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(scheduleId: string, userId: string) {
    const scheduled = await this.prisma.scheduledPost.findUnique({
      where: { id: scheduleId },
    });

    if (!scheduled) {
      throw new NotFoundException('Scheduled post not found');
    }

    if (scheduled.authorId !== userId) {
      throw new BadRequestException('You can only cancel your own scheduled posts');
    }

    if (scheduled.status !== 'PENDING') {
      throw new BadRequestException('Can only cancel pending scheduled posts');
    }

    const cancelled = await this.prisma.scheduledPost.update({
      where: { id: scheduleId },
      data: { status: 'CANCELLED' },
    });

    this.eventEmitter.emit('post.schedule_cancelled', {
      scheduleId,
      authorId: userId,
    });

    return { message: 'Scheduled post cancelled', cancelled };
  }

  /**
   * Process scheduled posts that are due (should be called by a cron job)
   */
  async publishDueScheduledPosts() {
    const now = new Date();

    // Find all pending posts that are due
    const duePosts = await this.prisma.scheduledPost.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
      },
      include: {
        author: true,
      },
    });

    const results = {
      published: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const scheduledPost of duePosts) {
      try {
        // Create the actual post
        const post = await this.prisma.post.create({
          data: {
            authorId: scheduledPost.authorId,
            content: scheduledPost.content,
            type: scheduledPost.type,
            mediaUrl: scheduledPost.mediaUrl,
            thumbnailUrl: scheduledPost.thumbnailUrl,
            visibility: scheduledPost.visibility,
            hashtags: scheduledPost.hashtags,
            mentions: scheduledPost.mentions,
          },
        });

        // Mark scheduled post as published
        await this.prisma.scheduledPost.update({
          where: { id: scheduledPost.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        results.published++;

        // Emit event
        this.eventEmitter.emit('post.published_from_schedule', {
          postId: post.id,
          authorId: scheduledPost.authorId,
          scheduledPostId: scheduledPost.id,
        });
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(
          `Failed to publish scheduled post ${scheduledPost.id}: ${errorMessage}`,
        );

        // Mark scheduled post as failed
        await this.prisma.scheduledPost.update({
          where: { id: scheduledPost.id },
          data: {
            status: 'FAILED',
            errorMessage: errorMessage.substring(0, 500), // Store error for debugging
          },
        });
      }
    }

    return results;
  }

  /**
   * Get scheduled post statistics
   */
  async getScheduleStats(userId: string) {
    const [
      pendingCount,
      publishedCount,
      failedCount,
      upcomingCount,
    ] = await Promise.all([
      this.prisma.scheduledPost.count({
        where: { authorId: userId, status: 'PENDING' },
      }),
      this.prisma.scheduledPost.count({
        where: { authorId: userId, status: 'PUBLISHED' },
      }),
      this.prisma.scheduledPost.count({
        where: { authorId: userId, status: 'FAILED' },
      }),
      this.prisma.scheduledPost.count({
        where: {
          authorId: userId,
          status: 'PENDING',
          scheduledFor: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      pending: pendingCount,
      published: publishedCount,
      failed: failedCount,
      upcomingThisWeek: upcomingCount,
    };
  }
}
