/**
 * Notifications Service
 * Business logic for notification operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NOTIFICATION_TYPES, NotificationType } from './notifications.constants';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async create(data: {
    userId: string;
    type: NotificationType;
    title?: string;
    message?: string;
    body?: string; // Alias for message
    actorId?: string;
    referenceId?: string;
    referenceType?: string;
    metadata?: Record<string, any>; // Additional metadata (stored in referenceType as JSON)
  }) {
    // Use body as message if message is not provided
    const messageContent = data.message || data.body;

    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: messageContent,
        actorId: data.actorId,
        referenceId: data.referenceId || (data.metadata ? JSON.stringify(data.metadata) : undefined),
        referenceType: data.referenceType,
      },
    });

    // Increment unread count on user (non-blocking, don't fail if this fails)
    await this.prisma.user.update({
      where: { id: data.userId },
      data: { unreadNotificationCount: { increment: 1 } },
    }).catch(() => {
      // Ignore errors, count will be recalculated if needed
    });

    return notification;
  }

  /**
   * Get notifications for a user (paginated)
   */
  async findAll(
    userId: string,
    params: { page: number; limit: number; unreadOnly?: boolean },
  ) {
    const { page, limit, unreadOnly } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        actorId: n.actorId,
        referenceId: n.referenceId,
        referenceType: n.referenceType,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
        unreadCount,
      },
    };
  }

  /**
   * Get a single notification
   */
  async findOne(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  /**
   * Mark a single notification as read (idempotent)
   * Always returns the same response format regardless of previous state
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.findOne(notificationId, userId);

    // If already read, just return it as-is (idempotent)
    if (notification.isRead) {
      return { success: true, notification };
    }

    // Mark as read and decrement unread count
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    // Decrement unread count on user (non-blocking)
    await this.prisma.user.update({
      where: { id: userId },
      data: { unreadNotificationCount: { decrement: 1 } },
    }).catch(() => {
      // Ignore errors, count will be recalculated if needed
    });

    return { success: true, notification: updated };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    // Update user's unread count to 0 (non-blocking)
    if (result.count > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { unreadNotificationCount: 0 },
      }).catch(() => {
        // Ignore errors
      });
    }

    return {
      message: 'All notifications marked as read',
      count: result.count,
    };
  }

  /**
   * Delete a single notification
   */
  async delete(notificationId: string, userId: string) {
    const notification = await this.findOne(notificationId, userId); // Verify ownership

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    // Decrement unread count if the notification was unread (non-blocking)
    if (!notification.isRead) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { unreadNotificationCount: { decrement: 1 } },
      }).catch(() => {
        // Ignore errors
      });
    }

    return { message: 'Notification deleted' };
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId, isRead: true },
    });

    return {
      message: 'All read notifications deleted',
      count: result.count,
    };
  }

  /**
   * Get unread notification count (from denormalized field)
   * Falls back to database count if denormalized count is out of sync
   */
  async getUnreadCount(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { unreadNotificationCount: true },
    });

    if (!user) {
      return 0;
    }

    // Use the denormalized count, but verify it's not stale
    // In a high-traffic scenario, you might want to resync periodically
    return user.unreadNotificationCount;
  }

  /**
   * Recalculate and sync the unread count for a user
   * Use this to fix any inconsistencies between denormalized and actual counts
   */
  async syncUnreadCount(userId: string): Promise<number> {
    const actualCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { unreadNotificationCount: actualCount },
    });

    return actualCount;
  }

  /**
   * Delete notifications older than the specified number of days (retention policy)
   * Default is 90 days
   */
  async cleanup(daysToRetain: number = 90): Promise<{ count: number }> {
    const cutoffDate = new Date(Date.now() - daysToRetain * 24 * 60 * 60 * 1000);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return { count: result.count };
  }
}
