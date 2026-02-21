/**
 * Notifications Service
 * Business logic for notification operations
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async create(data: {
    userId: string;
    type: string;
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
    
    return this.prisma.notification.create({
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
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.findOne(notificationId, userId);

    if (notification.isRead) {
      return { message: 'Notification already marked as read', notification };
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { message: 'Notification marked as read', notification: updated };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      message: 'All notifications marked as read',
      count: result.count,
    };
  }

  /**
   * Delete a single notification
   */
  async delete(notificationId: string, userId: string) {
    await this.findOne(notificationId, userId); // Verify ownership

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

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
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
