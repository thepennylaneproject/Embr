/**
 * Notifications Listener Service
 * Listens to application events and creates notifications
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_TYPES } from './notifications.constants';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
  ) {}

  /**
   * Listen for new comments and create notifications for the post author
   */
  @OnEvent('comment.created')
  async handleCommentCreated(payload: {
    commentId: string;
    postId: string;
    authorId: string;
    parentCommentId?: string;
  }) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: payload.postId },
        select: { authorId: true },
      });

      if (!post || post.authorId === payload.authorId) {
        // Don't notify if commenter is the post author or post not found
        return;
      }

      // Determine notification type
      const isReply = !!payload.parentCommentId;
      const notificationType = isReply
        ? NOTIFICATION_TYPES.COMMENT_REPLY
        : NOTIFICATION_TYPES.NEW_COMMENT;

      await this.notificationsService.create({
        userId: post.authorId,
        type: notificationType,
        actorId: payload.authorId,
        referenceId: payload.commentId,
        referenceType: 'COMMENT',
        message: isReply ? 'replied to a comment on your post' : 'commented on your post',
      });

      this.logger.debug(`Created ${notificationType} notification for post ${payload.postId}`);
    } catch (error) {
      // Log but don't throw - notification creation should not fail the comment operation
      this.logger.error(
        `Failed to create comment notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listen for comment likes and create notifications
   */
  @OnEvent('comment.liked')
  async handleCommentLiked(payload: {
    commentId: string;
    likedBy: string;
  }) {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id: payload.commentId },
        select: { authorId: true },
      });

      if (!comment || comment.authorId === payload.likedBy) {
        // Don't notify if user is liking their own comment
        return;
      }

      await this.notificationsService.create({
        userId: comment.authorId,
        type: NOTIFICATION_TYPES.COMMENT_LIKED,
        actorId: payload.likedBy,
        referenceId: payload.commentId,
        referenceType: 'COMMENT_LIKE',
        message: 'liked your comment',
      });

      this.logger.debug(`Created COMMENT_LIKED notification for comment ${payload.commentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create comment like notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listen for post likes and create notifications
   */
  @OnEvent('post.liked')
  async handlePostLiked(payload: {
    postId: string;
    likedBy: string;
  }) {
    try {
      const post = await this.prisma.post.findUnique({
        where: { id: payload.postId },
        select: { authorId: true },
      });

      if (!post || post.authorId === payload.likedBy) {
        // Don't notify if user is liking their own post
        return;
      }

      await this.notificationsService.create({
        userId: post.authorId,
        type: NOTIFICATION_TYPES.POST_LIKED,
        actorId: payload.likedBy,
        referenceId: payload.postId,
        referenceType: 'POST_LIKE',
        message: 'liked your post',
      });

      this.logger.debug(`Created POST_LIKED notification for post ${payload.postId}`);
    } catch (error) {
      this.logger.error(`Failed to create post like notification: ${error.message}`, error.stack);
    }
  }

  /**
   * Listen for new gig applications and notify the gig creator
   */
  @OnEvent('gig.application.created')
  async handleGigApplicationCreated(payload: {
    applicationId: string;
    gigId: string;
    applicantId: string;
    gigCreatorId: string;
  }) {
    try {
      const applicant = await this.prisma.user.findUnique({
        where: { id: payload.applicantId },
        select: { username: true },
      });

      if (!applicant) {
        return;
      }

      await this.notificationsService.create({
        userId: payload.gigCreatorId,
        type: NOTIFICATION_TYPES.GIG_APPLICATION,
        actorId: payload.applicantId,
        referenceId: payload.applicationId,
        referenceType: 'GIG_APPLICATION',
        message: `${applicant.username} applied for your gig`,
      });

      this.logger.debug(
        `Created GIG_APPLICATION notification for gig ${payload.gigId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create gig application notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listen for gig application acceptances and notify the applicant
   */
  @OnEvent('gig.application.accepted')
  async handleGigApplicationAccepted(payload: {
    applicationId: string;
    gigId: string;
    applicantId: string;
  }) {
    try {
      await this.notificationsService.create({
        userId: payload.applicantId,
        type: NOTIFICATION_TYPES.GIG_APPLICATION_ACCEPTED,
        referenceId: payload.applicationId,
        referenceType: 'GIG_APPLICATION',
        message: 'Your application was accepted!',
      });

      this.logger.debug(
        `Created GIG_APPLICATION_ACCEPTED notification for application ${payload.applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create application accepted notification: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Listen for gig application rejections and notify the applicant
   */
  @OnEvent('gig.application.rejected')
  async handleGigApplicationRejected(payload: {
    applicationId: string;
    gigId: string;
    applicantId: string;
  }) {
    try {
      await this.notificationsService.create({
        userId: payload.applicantId,
        type: NOTIFICATION_TYPES.GIG_APPLICATION_REJECTED,
        referenceId: payload.applicationId,
        referenceType: 'GIG_APPLICATION',
        message: 'Your application was not selected',
      });

      this.logger.debug(
        `Created GIG_APPLICATION_REJECTED notification for application ${payload.applicationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create application rejected notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
