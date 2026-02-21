import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  SearchUsersDto, 
  GetRecommendedUsersDto, 
  GetTrendingCreatorsDto,
  SimilarUsersDto
} from '../dto/discovery.dto';

interface SearchRankingFactors {
  textRelevance: number;
  followerCount: number;
  engagementRate: number;
  contentQuality: number;
  recency: number;
}

@Injectable()
export class UserDiscoveryService {
  constructor(private prisma: PrismaService) {}

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

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // Text search on username, full name, bio
    if (query) {
      where.OR = [
        { username: { contains: query, mode: 'insensitive' } },
        { profile: { displayName: { contains: query, mode: 'insensitive' } } },
        { profile: { bio: { contains: query, mode: 'insensitive' } } },
      ];
    }

    // Location filter
    if (location) {
      where.profile = {
        ...where.profile,
        location: { contains: location, mode: 'insensitive' },
      };
    }

    // Skills filter
    if (skills && skills.length > 0) {
      where.profile = {
        ...where.profile,
        skills: {
          hasSome: skills,
        },
      };
    }

    // Availability filter
    if (availability && availability !== 'any') {
      where.profile = {
        ...where.profile,
        availability: availability === 'available' ? 'available' : 'busy',
      };
    }

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
      }) as any),
      this.prisma.user.count({ where }),
    ]);

    // If sorting by engagement, calculate scores and re-sort
    let rankedUsers = users;
    if (sortBy === 'engagement' || sortBy === 'relevance') {
      const usersWithScores = await Promise.all(
        users.map(async (user) => {
          const score = await this.calculateUserRelevanceScore(user, currentUserId);
          return { user, score };
        })
      );

      usersWithScores.sort((a, b) => b.score - a.score);
      rankedUsers = usersWithScores.map(u => u.user);
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

    return {
      users: rankedUsers.map(user => ({
        id: user.id,
        username: user.username,
        verified: user.isVerified,
        profile: user.profile,
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

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        profile: {
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
      profile: user.profile,
      reason: 'Similar interests',
      stats: {
        followers: (user as any)._count.followers,
        posts: (user as any)._count.posts,
      },
    }));
  }

  /**
   * Get users through mutual connections
   */
  private async getMutualConnectionUsers(userId: string, limit: number) {
    const suggestions = await this.prisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.username,
        u.isVerified,
        COUNT(DISTINCT f1.follower_id) as mutual_count,
        p.avatar_url,
        p.full_name,
        p.bio,
        p.follower_count
      FROM users u
      INNER JOIN follows f2 ON f2.following_id = u.id
      INNER JOIN follows f1 ON f1.following_id = f2.follower_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE f1.follower_id = ${userId}
      AND f2.follower_id != ${userId}
      AND u.id != ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = ${userId} 
        AND following_id = u.id
      )
      GROUP BY u.id, u.username, u.isVerified, p.avatar_url, p.full_name, p.bio, p.follower_count
      ORDER BY mutual_count DESC, p.follower_count DESC
      LIMIT ${limit}
    `;

    return suggestions.map(s => ({
      id: s.id,
      username: s.username,
      verified: s.isVerified,
      profile: {
        avatarUrl: s.avatar_url,
        fullName: s.full_name,
        bio: s.bio,
        followerCount: s.follower_count,
      },
      reason: `${s.mutual_count} mutual connection${s.mutual_count > 1 ? 's' : ''}`,
      mutualCount: parseInt(s.mutual_count),
    }));
  }

  /**
   * Get currently trending users
   */
  private async getTrendingUsers(limit: number) {
    // Users with high engagement in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trending = await this.prisma.user.findMany({
      where: {
        posts: {
          some: {
            createdAt: { gte: sevenDaysAgo },
          },
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

    const scored = trending.map(user => {
      const totalEngagement = (user as any).posts.reduce((sum, post) => {
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
      profile: user.profile,
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
      this.getTrendingUsers(Math.ceil(limit / 3)),
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
   * Get trending creators with filters
   */
  async getTrendingCreators(dto: GetTrendingCreatorsDto) {
    const { timeframe = 'week', category, limit = 20 } = dto;

    const timeMap = {
      day: 1,
      week: 7,
      month: 30,
    };
    const days = timeMap[timeframe];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: any = {
      posts: {
        some: {
          createdAt: { gte: startDate },
        },
      },
    };

    if (category) {
      where.profile = {
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
            likeCount: true,
            commentCount: true,
            shareCount: true,
            viewCount: true,
          },
        },
        _count: {
          select: {
            followers: true,
            posts: true,
          },
        },
      },
    }) as any);

    // Calculate trending score
    const scored = creators.map(creator => {
      const engagement = (creator as any).posts.reduce((sum, post) => {
        return sum + post.likeCount + post.commentCount * 2 + 
               post.shareCount * 3 + post.viewCount * 0.1;
      }, 0);

      // Normalize by follower count to give smaller creators a chance
      const engagementRate = engagement / Math.max((creator as any)._count.followers, 100);
      const score = engagement + engagementRate * 100;

      return { creator, score, engagement };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
      creators: scored.slice(0, limit).map(({ creator, engagement }) => ({
        id: creator.id,
        username: creator.username,
        verified: creator.isVerified,
        profile: (creator as any).profile as any,
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
   * Get similar users based on current user profile
   */
  async getSimilarUsers(userId: string, dto: SimilarUsersDto) {
    const { limit = 10 } = dto;
    return this.getSimilarInterestUsers(userId, limit);
  }
}
