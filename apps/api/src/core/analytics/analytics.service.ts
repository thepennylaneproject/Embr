/**
 * Analytics Service
 * Tracks user events and provides analytics data
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export enum EventType {
  // User events
  USER_SIGNUP = 'USER_SIGNUP',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_UPDATED = 'USER_UPDATED',

  // Post events
  POST_CREATED = 'POST_CREATED',
  POST_VIEWED = 'POST_VIEWED',
  POST_LIKED = 'POST_LIKED',
  POST_UNLIKED = 'POST_UNLIKED',
  POST_SHARED = 'POST_SHARED',
  POST_DELETED = 'POST_DELETED',

  // Comment events
  COMMENT_CREATED = 'COMMENT_CREATED',
  COMMENT_LIKED = 'COMMENT_LIKED',
  COMMENT_DELETED = 'COMMENT_DELETED',

  // Search events
  SEARCH_PERFORMED = 'SEARCH_PERFORMED',

  // Follow events
  USER_FOLLOWED = 'USER_FOLLOWED',
  USER_UNFOLLOWED = 'USER_UNFOLLOWED',

  // Engagement events
  FEED_LOADED = 'FEED_LOADED',
  PAGE_VIEWED = 'PAGE_VIEWED',
}

export interface AnalyticsEvent {
  userId?: string;
  eventType: EventType;
  metadata?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track an event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          userId: event.userId,
          type: event.eventType as any,
          metadata: event.metadata || {},
          userAgent: event.userAgent,
          ipAddress: event.ipAddress,
        } as any,
      });
    } catch (error) {
      // Silently fail to not disrupt user experience
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string, daysBack: number = 30) {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const [
      posts,
      comments,
      likes,
      searches,
      follows,
      pageViews,
    ] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.POST_CREATED as any, createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.COMMENT_CREATED as any, createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.POST_LIKED as any, createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.SEARCH_PERFORMED as any, createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.USER_FOLLOWED as any, createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.PAGE_VIEWED as any, createdAt: { gte: startDate } },
      }),
    ]);

    return {
      userId,
      period: `${daysBack} days`,
      stats: {
        posts,
        comments,
        likes,
        searches,
        follows,
        pageViews,
      },
    };
  }

  /**
   * Get platform-wide analytics
   */
  async getPlatformAnalytics(daysBack: number = 30) {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const [
      activeUsers,
      newSignups,
      totalEvents,
      postsCreated,
      commentsCreated,
      searches,
    ] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: startDate } },
        distinct: ['userId'],
        select: { userId: true },
      }).then((events) => new Set(events.map((e) => e.userId)).size),
      this.prisma.analyticsEvent.count({
        where: { type: EventType.USER_SIGNUP as any, createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { type: EventType.POST_CREATED as any, createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { type: EventType.COMMENT_CREATED as any, createdAt: { gte: startDate } },
      }),
      this.prisma.analyticsEvent.count({
        where: { type: EventType.SEARCH_PERFORMED as any, createdAt: { gte: startDate } },
      }),
    ]);

    return {
      period: `${daysBack} days`,
      stats: {
        activeUsers,
        newSignups,
        totalEvents,
        postsCreated,
        commentsCreated,
        searches,
        avgEventsPerUser: Math.round(totalEvents / (activeUsers || 1)),
      },
    };
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(limit: number = 10, daysBack: number = 7) {
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const searches = await this.prisma.analyticsEvent.findMany({
      where: {
        type: EventType.SEARCH_PERFORMED as any,
        createdAt: { gte: startDate },
      },
      select: { metadata: true },
      orderBy: { createdAt: 'desc' },
    });

    // Count search queries
    const searchCounts: Record<string, number> = {};
    for (const event of searches) {
      const query = (event.metadata as any)?.query;
      if (query) {
        searchCounts[query] = (searchCounts[query] || 0) + 1;
      }
    }

    // Return top searches
    const trending = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({ query, count }));

    return trending;
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId: string) {
    const [
      postsLiked,
      commentsCreated,
      postViews,
      lastActiveAt,
    ] = await Promise.all([
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.POST_LIKED as any },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.COMMENT_CREATED as any },
      }),
      this.prisma.analyticsEvent.count({
        where: { userId, type: EventType.POST_VIEWED as any },
      }),
      this.prisma.analyticsEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    // Calculate engagement score (higher is more engaged)
    const engagementScore =
      postsLiked * 1 + commentsCreated * 3 + (postViews > 0 ? 1 : 0);

    return {
      userId,
      engagementMetrics: {
        postsLiked,
        commentsCreated,
        postViews,
        engagementScore,
        lastActiveAt: lastActiveAt?.createdAt,
      },
    };
  }

  /**
   * Delete old analytics events (privacy/cleanup)
   */
  async deleteOldEvents(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await this.prisma.analyticsEvent.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}
