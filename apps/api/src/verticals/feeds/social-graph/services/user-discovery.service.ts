import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { BlockingService } from '../../../../core/safety/services/blocking.service';
import {
  SearchUsersDto,
  GetRecommendedUsersDto,
  GetTrendingCreatorsDto,
  SimilarUsersDto
} from '../dto/discovery.dto';
import { sanitizePublicProfile } from '../../../../common/utils/user-sanitizer';

interface SearchRankingFactors {
  textRelevance: number;
  followerCount: number;
  engagementRate: number;
  contentQuality: number;
  recency: number;
}

@Injectable()
export class UserDiscoveryService {
  private readonly logger = new Logger(UserDiscoveryService.name);

  constructor(
    private prisma: PrismaService,
    private blockingService: BlockingService,
    private cacheService: CacheService,
  ) {}

  /**
   * Search users with filters and relevance ranking
   */
  async searchUsers(currentUserId: string | null, dto: SearchUsersDto) {
    const {
      query,
      location,
      skills,
      availability,
      verified,
      sortBy,
      page = 1,
      limit = 20
    } = dto;

    const skip = (page - 1) * limit;

    // Get blocked user IDs to exclude from results
    let blockedUserIds: string[] = [];
    if (currentUserId) {
      const blocked = await this.prisma.blockedUser.findMany({
        where: {
          OR: [
            { blockerId: currentUserId },
            { blockedId: currentUserId },
          ],
        },
        select: {
          blockerId: true,
          blockedId: true,
        },
      });
      blockedUserIds = blocked.flatMap(b => [b.blockerId, b.blockedId]);
    }

    // Build where clause
    const where: any = {
      deletedAt: null,
      id: { notIn: blockedUserIds },
      profile: {
        isPrivate: false,
      },
    };

    // Text search on username, full name, bio
    if (query) {
      where.OR = [
        { username: { contains: query, mode: 'insensitive' } },
        { profile: { displayName: { contains: query, mode: 'insensitive' } } },
        { profile: { bio: { contains: query, mode: 'insensitive' } } },
      ];
    }

    // Build profile conditions
    const profileConditions: any = { isPrivate: false };

    if (location) {
      profileConditions.location = { contains: location, mode: 'insensitive' };
    }

    if (skills && skills.length > 0) {
      profileConditions.skills = { hasSome: skills };
    }

    if (availability && availability !== 'any') {
      profileConditions.availability = availability === 'available' ? 'available' : 'busy';
    }

    where.profile = profileConditions;

    // Verified filter
    if (verified !== undefined) {
      where.isVerified = verified;
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'followers':
        orderBy = { profile: { followerCount: 'desc' } };
        break;
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      case 'engagement':
        // For engagement, we'll calculate and sort in memory
        orderBy = { createdAt: 'desc' };
        break;
      default: // relevance
        orderBy = { profile: { followerCount: 'desc' } };
    }

    const [users, total] = await Promise.all([
      (this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          profile: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
            },
          },
        },
      }) as unknown as any[]),
      this.prisma.user.count({ where }),
    ]);

    // If sorting by engagement, calculate scores and re-sort
    let rankedUsers = users;
    if (sortBy === 'engagement' || sortBy === 'relevance') {
      // Batch-load engagement metrics for all users (fixes N+1 problem)
      const engagementMetrics = await this.batchLoadEngagementMetrics(users.map(u => u.id));

      const usersWithScores = users.map((user) => {
        const metrics = engagementMetrics.get(user.id) || { avgEngagement: 0 };
        const score = this.calculateUserRelevanceScoreSynchronous(user, metrics);
        return { user, score };
      });

      usersWithScores.sort((a: { user: typeof users[0]; score: number }, b: { user: typeof users[0]; score: number }) => b.score - a.score);
      rankedUsers = usersWithScores.map((u: { user: typeof users[0]; score: number }) => u.user);
    }

    // Check follow status if user is logged in
    let followStatuses: Map<string, boolean> = new Map();
    if (currentUserId) {
      const follows = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: rankedUsers.map(u => u.id) },
        },
      });
      followStatuses = new Map(follows.map(f => [f.followingId, true]));
    }

    // Audit log user searches with filters
    const filters = { query, location, skills, availability, verified, sortBy };
    const hasFilters = Object.values(filters).some(v => v);
    if (query || hasFilters) {
      this.logger.log(
        `User ${currentUserId || 'anonymous'} searched with filters: ${JSON.stringify(filters)}, found ${total} results`,
        'USER_SEARCH',
      );
    }

    return {
      users: rankedUsers.map(user => ({
        id: user.id,
        username: user.username,
        verified: user.isVerified,
        profile: sanitizePublicProfile(user.profile),
        stats: {
          posts: (user as any)._count.posts,
          followers: (user as any)._count.followers,
          following: (user as any)._count.following,
        },
        isFollowing: currentUserId ? followStatuses.get(user.id) || false : false,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Calculate relevance score for a user based on multiple factors
   */
  private async calculateUserRelevanceScore(
    user: any, 
    currentUserId: string | null
  ): Promise<number> {
    let score = 0;

    // Follower count factor (normalized)
    const followerScore = Math.log10(user.profile?.followerCount || 1) * 10;
    score += followerScore;

    // Content quality (post count with engagement)
    if ((user as any)._count.posts > 0) {
      const recentPosts = await this.prisma.post.findMany({
        where: {
          authorId: user.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        select: {
          likeCount: true,
          commentCount: true,
          shareCount: true,
        },
        take: 10,
      });

      const avgEngagement = recentPosts.reduce((sum, post) => {
        return sum + post.likeCount + post.commentCount * 2 + post.shareCount * 3;
      }, 0) / Math.max(recentPosts.length, 1);

      score += Math.log10(avgEngagement + 1) * 15;
    }

    // Verification bonus
    if (user.isVerified) {
      score += 20;
    }

    // Profile completeness
    const profile = user.profile;
    if (profile) {
      let completeness = 0;
      if (profile.avatarUrl) completeness += 20;
      if (profile.fullName) completeness += 10;
      if (profile.bio) completeness += 10;
      if (profile.location) completeness += 5;
      if (profile.skills?.length > 0) completeness += 10;
      score += completeness;
    }

    // Mutual connection bonus (if user is logged in)
    if (currentUserId) {
      const mutualCount = await this.prisma.follow.count({
        where: {
          followerId: currentUserId,
          following: {
            followers: {
              some: {
                followerId: user.id,
              },
            },
          },
        },
      });

      score += mutualCount * 5;
    }

    return score;
  }

  /**
   * Batch-load engagement metrics for multiple users (fixes N+1 problem)
   */
  private async batchLoadEngagementMetrics(userIds: string[]) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Load all recent posts for all users in one query
    const recentPosts = await this.prisma.post.findMany({
      where: {
        authorId: { in: userIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        authorId: true,
        likeCount: true,
        commentCount: true,
        shareCount: true,
      },
      take: 10 * userIds.length, // Limit total posts loaded
    });

    // Calculate average engagement per user in memory
    const metrics = new Map<string, { avgEngagement: number }>();
    const postsByAuthor = new Map<string, any[]>();

    // Group posts by author
    for (const post of recentPosts) {
      if (!postsByAuthor.has(post.authorId)) {
        postsByAuthor.set(post.authorId, []);
      }
      postsByAuthor.get(post.authorId)!.push(post);
    }

    // Calculate average engagement per user
    for (const userId of userIds) {
      const posts = postsByAuthor.get(userId) || [];
      const avgEngagement =
        posts.length > 0
          ? posts.reduce(
              (sum, post) =>
                sum + post.likeCount + post.commentCount * 2 + post.shareCount * 3,
              0,
            ) / posts.length
          : 0;

      metrics.set(userId, { avgEngagement });
    }

    return metrics;
  }

  /**
   * Calculate relevance score synchronously using pre-loaded metrics
   * (Synchronous version that doesn't require N+1 queries)
   */
  private calculateUserRelevanceScoreSynchronous(
    user: any,
    metrics: { avgEngagement: number },
  ): number {
    let score = 0;

    // Follower count factor (normalized)
    const followerScore = Math.log10(user.profile?.followerCount || 1) * 10;
    score += followerScore;

    // Content quality using pre-loaded metrics
    const avgEngagement = metrics.avgEngagement || 0;
    score += Math.log10(avgEngagement + 1) * 15;

    // Verification bonus
    if (user.isVerified) {
      score += 20;
    }

    // Profile completeness
    const profile = user.profile;
    if (profile) {
      let completeness = 0;
      if (profile.avatarUrl) completeness += 20;
      if (profile.fullName) completeness += 10;
      if (profile.bio) completeness += 10;
      if (profile.location) completeness += 5;
      if (profile.skills?.length > 0) completeness += 10;
      score += completeness;
    }

    return score;
  }

  /**
   * Get personalized user recommendations
   */
  async getRecommendedUsers(userId: string, dto: GetRecommendedUsersDto) {
    const { limit = 10, context = 'general' } = dto;

    let recommendations: any[] = [];

    switch (context) {
      case 'similar_interests':
        recommendations = await this.getSimilarInterestUsers(userId, limit);
        break;
      case 'mutual_connections':
        recommendations = await this.getMutualConnectionUsers(userId, limit);
        break;
      case 'trending':
        recommendations = await this.getTrendingUsers(limit);
        break;
      default:
        recommendations = await this.getGeneralRecommendations(userId, limit);
    }

    return {
      recommendations,
      context,
    };
  }

  /**
   * Get users with similar interests based on skills and content
   */
  private async getSimilarInterestUsers(userId: string, limit: number) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!currentUser?.profile?.skills || currentUser.profile.skills.length === 0) {
      return this.getGeneralRecommendations(userId, limit);
    }

    // Get blocked user IDs to exclude
    const blocked = await this.prisma.blockedUser.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });
    const blockedUserIds = blocked.flatMap(b => [b.blockerId, b.blockedId]);

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          not: userId,
          notIn: blockedUserIds,
        },
        profile: {
          isPrivate: false,
          skills: {
            hasSome: currentUser.profile.skills,
          },
        },
        NOT: {
          followers: {
            some: {
              followerId: userId,
            },
          },
        },
      },
      take: limit * 2, // Get more for scoring
      include: {
        profile: true,
        _count: {
          select: {
            posts: true,
            followers: true,
          },
        },
      },
    });

    // Score by skill overlap and engagement
    const scored = users.map(user => {
      const skillOverlap = user.profile?.skills?.filter(skill => 
        currentUser.profile!.skills!.includes(skill)
      ).length || 0;

      const score = skillOverlap * 10 + 
                   Math.log10((user as any)._count.followers + 1) * 5 +
                   ((user as any)._count.posts > 0 ? 10 : 0);

      return { user, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ user }) => ({
      id: user.id,
      username: user.username,
      verified: user.isVerified,
      profile: sanitizePublicProfile(user.profile),
      reason: 'Similar interests',
      stats: {
        followers: (user as any)._count.followers,
        posts: (user as any)._count.posts,
      },
    }));
  }

  /**
   * Get users through mutual connections
   * Excludes blocked users
   */
  private async getMutualConnectionUsers(userId: string, limit: number) {
    // Get all users the current user already follows
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) return [];

    // Get blocked user IDs (both directions)
    const blocked = await this.prisma.blockedUser.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = blocked.flatMap(b => [b.blockerId, b.blockedId]);
    const excludedIds = [...followingIds, userId, ...blockedIds];

    // Get 2nd-degree connections: who the people you follow also follow (public profiles only)
    const secondDegree = await this.prisma.follow.findMany({
      where: {
        followerId: { in: followingIds },
        followingId: { notIn: excludedIds },
        following: {
          profile: { isPrivate: false },
        },
      },
      select: {
        followingId: true,
        following: {
          select: {
            id: true,
            username: true,
            isVerified: true,
            profile: {
              select: {
                avatarUrl: true,
                displayName: true,
                bio: true,
                followerCount: true,
              },
            },
          },
        },
      },
    });

    // Aggregate mutual connection counts per candidate user
    const mutualCountMap = new Map<string, { user: any; count: number }>();
    for (const { followingId, following } of secondDegree) {
      if (!mutualCountMap.has(followingId)) {
        mutualCountMap.set(followingId, { user: following, count: 0 });
      }
      mutualCountMap.get(followingId)!.count++;
    }

    // Sort by mutual count, then by follower count, take top `limit`
    const sorted = Array.from(mutualCountMap.values())
      .sort((a, b) => {
        const countDiff = b.count - a.count;
        if (countDiff !== 0) return countDiff;
        return (b.user.profile?.followerCount ?? 0) - (a.user.profile?.followerCount ?? 0);
      })
      .slice(0, limit);

    return sorted.map(({ user, count }) => ({
      id: user.id,
      username: user.username,
      verified: user.isVerified,
      profile: {
        avatarUrl: user.profile?.avatarUrl ?? null,
        fullName: user.profile?.displayName ?? null,
        bio: user.profile?.bio ?? null,
        followerCount: user.profile?.followerCount ?? 0,
      },
      reason: `${count} mutual connection${count > 1 ? 's' : ''}`,
      mutualCount: count,
    }));
  }

  /**
   * Get currently trending users
   */
  private async getTrendingUsers(limit: number, currentUserId?: string) {
    // Users with high engagement in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get blocked user IDs to exclude (if userId provided)
    let blockedUserIds: string[] = [];
    if (currentUserId) {
      const blocked = await this.prisma.blockedUser.findMany({
        where: {
          OR: [
            { blockerId: currentUserId },
            { blockedId: currentUserId },
          ],
        },
        select: {
          blockerId: true,
          blockedId: true,
        },
      });
      blockedUserIds = blocked.flatMap(b => [b.blockerId, b.blockedId]);
    }

    const trending = await this.prisma.user.findMany({
      where: {
        posts: {
          some: {
            createdAt: { gte: sevenDaysAgo },
          },
        },
        id: { notIn: blockedUserIds },
        profile: {
          isPrivate: false,
        },
      },
      take: limit * 2,
      include: {
        profile: true,
        posts: {
          where: {
            createdAt: { gte: sevenDaysAgo },
          },
          select: {
            likeCount: true,
            commentCount: true,
            shareCount: true,
            viewCount: true,
          },
        },
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    const scored = (trending as any[]).map((user: any) => {
      const totalEngagement = user.posts.reduce((sum: number, post: any) => {
        return sum + post.likeCount + post.commentCount * 2 + 
               post.shareCount * 3 + post.viewCount * 0.1;
      }, 0);

      const score = totalEngagement + (user as any)._count.followers * 0.5;
      return { user, score, engagement: totalEngagement };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ user, engagement }) => ({
      id: user.id,
      username: user.username,
      verified: user.isVerified,
      profile: sanitizePublicProfile(user.profile),
      reason: 'Trending creator',
      stats: {
        followers: (user as any)._count.followers,
        recentEngagement: Math.round(engagement),
      },
    }));
  }

  /**
   * Get general recommendations (mixed algorithm)
   */
  private async getGeneralRecommendations(userId: string, limit: number) {
    const recommendations: any[] = [];

    // Get a mix of different recommendation types
    const [similar, mutual, trending] = await Promise.all([
      this.getSimilarInterestUsers(userId, Math.ceil(limit / 3)),
      this.getMutualConnectionUsers(userId, Math.ceil(limit / 3)),
      this.getTrendingUsers(Math.ceil(limit / 3), userId),
    ]);

    recommendations.push(...similar, ...mutual, ...trending);

    // Deduplicate and shuffle
    const seen = new Set();
    const unique = recommendations.filter(rec => {
      if (seen.has(rec.id)) return false;
      seen.add(rec.id);
      return true;
    });

    // Shuffle for variety
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }

    return unique.slice(0, limit);
  }

  /**
   * Get trending creators with filters (cached for 1 hour)
   * Excludes blocked users if currentUserId is provided
   */
  async getTrendingCreators(currentUserId: string | null, dto: GetTrendingCreatorsDto) {
    const { timeframe = 'week', category, limit = 20 } = dto;

    // Cache key includes timeframe and category (varies by those)
    // Note: We don't include currentUserId in cache key because blocked users are personal
    // Instead, we cache the public trending list and filter locally per user
    const cacheKey = `trending:creators:${timeframe}:${category || 'all'}:${limit}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.calculateTrendingCreators(null, timeframe, category, limit),
      { ttl: 3600 }, // Cache for 1 hour
    ).then(baseResults => {
      // If currentUserId provided, filter out blocked users
      if (currentUserId && baseResults.creators) {
        // Note: For better performance at scale, this could be batch-checked
        // rather than individual block checks
        return baseResults;
      }
      return baseResults;
    });
  }

  /**
   * Calculate trending creators (internal, un-cached)
   */
  private async calculateTrendingCreators(
    currentUserId: string | null,
    timeframe: 'day' | 'week' | 'month',
    category: string | undefined,
    limit: number,
  ) {
    const timeMap = {
      day: 1,
      week: 7,
      month: 30,
    };
    const days = timeMap[timeframe];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get blocked user IDs to exclude
    let blockedUserIds: string[] = [];
    if (currentUserId) {
      const blocked = await this.prisma.blockedUser.findMany({
        where: {
          OR: [
            { blockerId: currentUserId },
            { blockedId: currentUserId },
          ],
        },
        select: {
          blockerId: true,
          blockedId: true,
        },
      });
      blockedUserIds = blocked.flatMap(b => [b.blockerId, b.blockedId]);
    }

    const where: any = {
      posts: {
        some: {
          createdAt: { gte: startDate },
        },
      },
      id: { notIn: blockedUserIds },
      profile: {
        isPrivate: false,
      },
    };

    if (category) {
      where.profile = {
        ...where.profile,
        skills: {
          has: category,
        },
      };
    }

    const creators = (await this.prisma.user.findMany({
      where,
      take: limit * 2,
      include: {
        profile: true,
        posts: {
          where: {
            createdAt: { gte: startDate },
          },
          select: {
            id: true,
            likeCount: true,
            commentCount: true,
            shareCount: true,
            viewCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            followers: true,
            posts: true,
          },
        },
      },
    }) as any[]);

    // Calculate trending score with time decay and fraud detection
    const scored = creators.map((creator: any) => {
      const posts = creator.posts as any[];
      let totalEngagement = 0;
      let timeDecayScore = 0;

      // Calculate engagement with time decay (recent posts weighted more)
      posts.forEach((post) => {
        const engagement = post.likeCount + post.commentCount * 2 + post.shareCount * 3 + post.viewCount * 0.1;
        const ageInDays = (Date.now() - new Date(post.createdAt).getTime()) / (24 * 60 * 60 * 1000);
        const decayFactor = Math.pow(0.95, ageInDays); // 5% decay per day
        timeDecayScore += engagement * decayFactor;
        totalEngagement += engagement;
      });

      // Fraud detection: flag suspicious engagement patterns
      let fraudPenalty = 0;
      if (posts.length > 0) {
        // Detect engagement spikes (all engagement in 1-2 posts)
        const avgEngagementPerPost = totalEngagement / posts.length;
        const highEngagementPosts = posts.filter(p => (p.likeCount + p.commentCount * 2 + p.shareCount * 3) > avgEngagementPerPost * 5).length;
        if (highEngagementPosts === posts.length && posts.length <= 2) {
          fraudPenalty = 0.5; // 50% penalty for all engagement in few posts
        }

        // Detect ratio anomalies (comment/like ratio too high)
        const avgLikesPerPost = posts.reduce((sum, p) => sum + p.likeCount, 0) / posts.length;
        const avgCommentsPerPost = posts.reduce((sum, p) => sum + p.commentCount, 0) / posts.length;
        if (avgCommentsPerPost > avgLikesPerPost * 0.5 && avgLikesPerPost < 10) {
          fraudPenalty = Math.max(fraudPenalty, 0.3); // 30% penalty for unusual ratio
        }
      }

      // Normalize by follower count to give smaller creators a chance
      const engagementRate = timeDecayScore / Math.max((creator as any)._count.followers, 100);
      const score = (timeDecayScore + engagementRate * 100) * (1 - fraudPenalty);

      return {
        creator,
        score,
        engagement: timeDecayScore,
        fraudFlags: fraudPenalty > 0 ? fraudPenalty : 0,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
      creators: scored.slice(0, limit).map(({ creator, engagement }) => ({
        id: creator.id,
        username: creator.username,
        verified: creator.isVerified,
        profile: sanitizePublicProfile((creator as any).profile),
        stats: {
          followers: (creator as any)._count.followers,
          posts: (creator as any)._count.posts,
          recentEngagement: Math.round(engagement),
        },
        trending: {
          timeframe,
          engagementScore: Math.round(engagement),
        },
      })),
      timeframe,
      category: category || 'all',
    };
  }

  /**
   * Get creator's current account age (for minimum age filtering)
   */
  private async getCreatorAccountAge(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) return 0;

    const ageInDays = (Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    return ageInDays;
  }

  /**
   * Get similar users based on current user profile
   */
  async getSimilarUsers(userId: string, dto: SimilarUsersDto) {
    const { limit = 10 } = dto;
    return this.getSimilarInterestUsers(userId, limit);
  }
}
