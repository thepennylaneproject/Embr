/**
 * Notifications Analytics Service
 * Tracks notification delivery, engagement, and user preferences
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NOTIFICATION_TYPES } from './notifications.constants';

interface NotificationMetrics {
  type: string;
  created: number;
  read: number;
  readRate: number; // percentage of notifications that were read
  avgTimeToRead: number; // milliseconds
  deleted: number;
  deletionRate: number;
}

interface DeliveryStats {
  totalCreated: number;
  totalRead: number;
  overallReadRate: number;
  averageReadTime: number;
  byType: NotificationMetrics[];
  topUnreadTypes: Array<{ type: string; count: number }>;
}

@Injectable()
export class NotificationsAnalyticsService {
  private readonly logger = new Logger(NotificationsAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get comprehensive notification delivery statistics
   */
  async getDeliveryStats(days: number = 30): Promise<DeliveryStats> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [allNotifications, readNotifications] = await Promise.all([
      this.prisma.notification.findMany({
        where: { createdAt: { gte: since } },
        select: { type: true, isRead: true, createdAt: true },
      }),
      this.prisma.notification.findMany({
        where: {
          createdAt: { gte: since },
          isRead: true,
        },
        select: { type: true, createdAt: true },
      }),
    ]);

    // Calculate metrics by type
    const metricsMap = new Map<string, NotificationMetrics>();

    for (const notif of allNotifications) {
      if (!metricsMap.has(notif.type)) {
        metricsMap.set(notif.type, {
          type: notif.type,
          created: 0,
          read: 0,
          readRate: 0,
          avgTimeToRead: 0,
          deleted: 0,
          deletionRate: 0,
        });
      }

      const metric = metricsMap.get(notif.type)!;
      metric.created++;

      if (notif.isRead) {
        metric.read++;
      }
    }

    // Calculate rates
    const byType = Array.from(metricsMap.values()).map((m) => ({
      ...m,
      readRate: m.created > 0 ? (m.read / m.created) * 100 : 0,
    }));

    const totalCreated = allNotifications.length;
    const totalRead = readNotifications.length;
    const overallReadRate = totalCreated > 0 ? (totalRead / totalCreated) * 100 : 0;

    // Find top unread types
    const unreadByType = new Map<string, number>();
    for (const notif of allNotifications) {
      if (!notif.isRead) {
        unreadByType.set(notif.type, (unreadByType.get(notif.type) ?? 0) + 1);
      }
    }

    const topUnreadTypes = Array.from(unreadByType.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalCreated,
      totalRead,
      overallReadRate,
      averageReadTime: 0, // Would require timestamp on read action
      byType,
      topUnreadTypes,
    };
  }

  /**
   * Get per-user notification engagement
   */
  async getUserNotificationStats(userId: string) {
    const [total, unread, read, deleted] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
      this.prisma.notification.count({
        where: { userId, isRead: true },
      }),
      // Note: This would need tracking for deleted notifications
    ]);

    const readRate = total > 0 ? (read / total) * 100 : 0;

    return {
      userId,
      totalNotifications: total,
      unreadNotifications: unread,
      readNotifications: read,
      readRate,
      engagementLevel:
        readRate > 75 ? 'high' : readRate > 50 ? 'medium' : 'low',
    };
  }

  /**
   * Find users with high unread counts (potential issues)
   */
  async findHighUnreadUsers(threshold: number = 50) {
    const users = await this.prisma.user.findMany({
      where: {
        unreadNotificationCount: { gte: threshold },
      },
      select: {
        id: true,
        email: true,
        username: true,
        unreadNotificationCount: true,
      },
      orderBy: { unreadNotificationCount: 'desc' },
      take: 100,
    });

    return users;
  }

  /**
   * Log notification event for analytics
   */
  async logEvent(
    userId: string,
    event: 'created' | 'read' | 'deleted' | 'bounced',
    notificationType: string,
  ) {
    try {
      // Could be extended to write to a dedicated analytics table
      this.logger.debug(`Notification event: ${event} for ${notificationType} by user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to log notification event: ${error.message}`);
    }
  }

  /**
   * Get notification delivery health report
   */
  async getHealthReport() {
    const stats = await this.getDeliveryStats(7);
    const highUnreadUsers = await this.findHighUnreadUsers();

    const alerting = {
      hasIssues: stats.overallReadRate < 30 || highUnreadUsers.length > 10,
      lowEngagement: stats.overallReadRate < 30,
      manyUnreadsUsers: highUnreadUsers.length > 10,
    };

    return {
      timestamp: new Date(),
      overallReadRate: stats.overallReadRate,
      criticalTypes: stats.byType.filter((t) => t.readRate < 20),
      highUnreadUsers: highUnreadUsers.slice(0, 5),
      alerting,
    };
  }
}
