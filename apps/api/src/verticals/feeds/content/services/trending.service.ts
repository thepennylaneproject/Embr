/**
 * Trending Service
 * Sophisticated trending algorithm for posts, hashtags, and creators
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';
import { CacheService } from '../../../../core/cache/cache.service';

interface TrendingScore {
  id: string;
  score: number;
}

@Injectable()
export class TrendingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get trending posts using sophisticated algorithm
   * Factors: recency, engagement (likes/comments), velocity (rate of engagement)
   */
  async getTrendingPosts(limit: number = 20, timeWindowHours: number = 24) {
    const cacheKey = `trending:posts:${timeWindowHours}h`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const startTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        createdAt: { gte: startTime },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true, isVerified: true },
            },
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
      take: limit * 3, // Get more to filter through
    });

    // Calculate trending score for each post
    const scored = posts.map((post) => ({
      ...post,
      trendingScore: this.calculatePostTrendingScore(post, startTime),
    }));

    // Sort by score and return top results
    const trending = scored
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit)
      .map(({ trendingScore, ...post }) => post);

    const result = {
      data: trending,
      meta: {
        limit,
        timeWindowHours,
        calculatedAt: new Date(),
      },
    };

    // Cache for 30 minutes
    await this.cache.set(cacheKey, result, { ttl: 1800 });
    return result;
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(limit: number = 20, timeWindowHours: number = 24) {
    const cacheKey = `trending:hashtags:${timeWindowHours}h`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const startTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        createdAt: { gte: startTime },
      },
      select: { hashtags: true, likeCount: true, commentCount: true, createdAt: true },
    });

    // Count and score hashtags
    const hashtagScores: Record<string, { count: number; engagement: number }> = {};

    for (const post of posts) {
      const engagement = post.likeCount + post.commentCount;
      const recencyScore = this.calculateRecencyScore(post.createdAt);

      for (const tag of post.hashtags) {
        if (!hashtagScores[tag]) {
          hashtagScores[tag] = { count: 0, engagement: 0 };
        }
        hashtagScores[tag].count++;
        hashtagScores[tag].engagement += engagement * recencyScore;
      }
    }

    // Calculate final score and sort
    const trending = Object.entries(hashtagScores)
      .map(([tag, { count, engagement }]) => ({
        tag,
        postCount: count,
        score: count * 0.4 + (engagement / Math.max(count, 1)) * 0.6, // Weighted score
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...item }) => item);

    const result = {
      data: trending,
      meta: { limit, timeWindowHours },
    };

    // Cache for 1 hour
    await this.cache.set(cacheKey, result, { ttl: 3600 });
    return result;
  }

  /**
   * Get trending creators (users with most engagement growth)
   */
  async getTrendingCreators(limit: number = 20, timeWindowDays: number = 7) {
    const cacheKey = `trending:creators:${timeWindowDays}d`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const startTime = new Date(Date.now() - timeWindowDays * 24 * 60 * 60 * 1000);

    // Get user engagement in time window, ordered by total engagement descending.
    // We fetch limit*3 rows at the DB level so the groupBy result set is bounded,
    // eliminating the unbounded N that previously drove the N+1 pattern below.
    const userEngagement = await this.prisma.post.groupBy({
      by: ['authorId'],
      where: {
        deletedAt: null,
        createdAt: { gte: startTime },
      },
      _sum: { likeCount: true, commentCount: true },
      _count: { id: true },
      orderBy: { _sum: { likeCount: 'desc' } },
      take: limit * 3,
    });

    // Pre-score and slice to top candidates before touching the users table.
    // This is safe because we don't yet have the isVerified bonus, but the
    // ordering is close enough to avoid loading unnecessary user rows.
    const topEngagement = userEngagement
      .map((e) => ({
        authorId: e.authorId,
        roughScore:
          ((e._sum.likeCount || 0) + (e._sum.commentCount || 0)) * 0.5 +
          (e._count as any).id * 10,
        likeCount: e._sum.likeCount || 0,
        commentCount: e._sum.commentCount || 0,
        postCount: (e._count as any).id,
      }))
      .sort((a, b) => b.roughScore - a.roughScore)
      .slice(0, limit * 2);

    const authorIds = topEngagement.map((e) => e.authorId);

    // Single batched lookup instead of one findUnique per row (eliminates N+1).
    const users = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: {
        id: true,
        username: true,
        profile: {
          select: {
            displayName: true,
            avatarUrl: true,
            isVerified: true,
            followerCount: true,
          },
        },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Rescore with the verified bonus now that we have user data.
    const trendingUsers = topEngagement
      .map((e) => {
        const user = userMap.get(e.authorId);
        if (!user) return null;
        const score = e.roughScore + (user.profile?.isVerified ? 50 : 0);
        return { user, score };
      })
      .filter((item) => item !== null)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, limit)
      .map(({ user }) => user);

    const result = {
      data: trendingUsers,
      meta: { limit, timeWindowDays },
    };

    // Cache for 2 hours
    await this.cache.set(cacheKey, result, { ttl: 7200 });
    return result;
  }

  /**
   * Get trending for a specific category/hashtag
   */
  async getTrendingInCategory(
    hashtag: string,
    limit: number = 20,
    timeWindowHours: number = 24,
  ) {
    const cacheKey = `trending:category:${hashtag}:${timeWindowHours}h`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const startTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        hashtags: { has: hashtag.toLowerCase() },
        createdAt: { gte: startTime },
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
      take: limit * 2,
    });

    const scored = posts.map((post) => ({
      ...post,
      trendingScore: this.calculatePostTrendingScore(post, startTime),
    }));

    const result = {
      hashtag,
      data: scored
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit)
        .map(({ trendingScore, ...post }) => post),
      meta: { limit, timeWindowHours },
    };

    // Cache for 1 hour
    await this.cache.set(cacheKey, result, { ttl: 3600 });
    return result;
  }

  // Private scoring algorithms

  /**
   * Calculate trending score for a post
   * Formula: engagement * recency * velocity
   */
  private calculatePostTrendingScore(
    post: any,
    startTime: Date,
  ): number {
    const engagement = (post._count?.likes || 0) + (post._count?.comments || 0);
    const recencyScore = this.calculateRecencyScore(post.createdAt);
    const velocityScore = this.calculateVelocityScore(post, startTime);

    // Weighted formula
    return engagement * 0.4 + recencyScore * 0.3 + velocityScore * 0.3;
  }

  /**
   * Calculate recency score (newer posts rank higher)
   * Returns value between 0 and 1, with exponential decay
   */
  private calculateRecencyScore(createdAt: Date): number {
    const ageHours = (Date.now() - createdAt.getTime()) / (60 * 60 * 1000);
    // Decay function: score drops to 0.5 after 24 hours
    return Math.exp(-ageHours / 24);
  }

  /**
   * Calculate velocity score (how fast engagement is growing)
   * Based on engagement rate in the time window
   */
  private calculateVelocityScore(post: any, windowStart: Date): number {
    const windowAge = (Date.now() - windowStart.getTime()) / (60 * 60 * 1000);
    const postAge = (Date.now() - post.createdAt.getTime()) / (60 * 60 * 1000);
    const activeHours = Math.min(postAge, windowAge);

    if (activeHours === 0) return 0;

    const engagement = (post._count?.likes || 0) + (post._count?.comments || 0);
    const engagementPerHour = engagement / activeHours;

    // Normalize with logarithmic scale
    return Math.min(Math.log1p(engagementPerHour), 5) / 5; // Cap at 1
  }
}
