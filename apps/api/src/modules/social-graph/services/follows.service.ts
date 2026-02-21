import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  FollowUserDto, 
  GetFollowersDto, 
  GetFollowingDto,
  CheckFollowDto,
  GetMutualConnectionsDto,
  BatchFollowCheckDto
} from '../dto/follow.dto';

@Injectable()
export class FollowsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Follow a user
   */
  async followUser(followerId: string, dto: FollowUserDto) {
    // Prevent self-following
    if (followerId === dto.followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.followingId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: dto.followingId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    // Create follow relationship
    const follow = await this.prisma.follow.create({
      data: {
        followerId,
        followingId: dto.followingId,
      },
      include: {
        following: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Update follower counts (denormalized for performance)
    await Promise.all([
      this.prisma.profile.update({
        where: { userId: followerId },
        data: { followingCount: { increment: 1 } },
      }),
      this.prisma.profile.update({
        where: { userId: dto.followingId },
        data: { followerCount: { increment: 1 } },
      }),
    ]);

    // Create notification for followed user
    await this.prisma.notification.create({
      data: {
        userId: dto.followingId,
        type: 'NEW_FOLLOWER',
        actorId: followerId,
        message: `started following you`,
      },
    }).catch(() => {
      // Notification creation is non-critical
    });

    return {
      id: follow.id,
      followerId: follow.followerId,
      followingId: follow.followingId,
      createdAt: follow.createdAt,
      user: {
        id: follow.following.id,
        username: follow.following.username,
        profile: follow.following.profile,
      },
    };
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    // Delete follow relationship
    await this.prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    // Update follower counts
    await Promise.all([
      this.prisma.profile.update({
        where: { userId: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
      this.prisma.profile.update({
        where: { userId: followingId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);

    return { message: 'Successfully unfollowed user' };
  }

  /**
   * Get user's followers with pagination
   */
  async getFollowers(userId: string, dto: GetFollowersDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followingId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          follower: {
            include: {
              profile: true,
            },
          },
        },
      }),
      this.prisma.follow.count({
        where: { followingId: userId },
      }),
    ]);

    return {
      followers: followers.map(f => ({
        id: f.follower.id,
        username: f.follower.username,
        email: f.follower.email,
        profile: f.follower.profile,
        followedAt: f.createdAt,
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
   * Get users that a user is following with pagination
   */
  async getFollowing(userId: string, dto: GetFollowingDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          following: {
            include: {
              profile: true,
            },
          },
        },
      }),
      this.prisma.follow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      following: following.map(f => ({
        id: f.following.id,
        username: f.following.username,
        email: f.following.email,
        profile: f.following.profile,
        followedAt: f.createdAt,
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
   * Check if user is following another user
   */
  async checkFollowStatus(dto: CheckFollowDto) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: dto.userId,
          followingId: dto.targetUserId,
        },
      },
    });

    return {
      isFollowing: !!follow,
      followedAt: follow?.createdAt || null,
    };
  }

  /**
   * Batch check if user is following multiple users
   */
  async batchCheckFollowStatus(userId: string, dto: BatchFollowCheckDto) {
    const follows = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: dto.userIds },
      },
      select: {
        followingId: true,
        createdAt: true,
      },
    });

    const followMap = new Map(
      follows.map(f => [f.followingId, f.createdAt])
    );

    return dto.userIds.map(id => ({
      userId: id,
      isFollowing: followMap.has(id),
      followedAt: followMap.get(id) || null,
    }));
  }

  /**
   * Get mutual connections between two users
   */
  async getMutualConnections(currentUserId: string, dto: GetMutualConnectionsDto) {
    const { userId, limit = 10 } = dto;

    // Get users that both current user and target user follow
    const mutualFollowing = await this.prisma.follow.findMany({
      where: {
        followerId: currentUserId,
        following: {
          followers: {
            some: {
              followerId: userId,
            },
          },
        },
      },
      take: limit,
      include: {
        following: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Get users that follow both current user and target user
    const mutualFollowers = await this.prisma.follow.findMany({
      where: {
        followingId: currentUserId,
        follower: {
          following: {
            some: {
              followingId: userId,
            },
          },
        },
      },
      take: limit,
      include: {
        follower: {
          include: {
            profile: true,
          },
        },
      },
    });

    return {
      mutualFollowing: mutualFollowing.map(f => ({
        id: f.following.id,
        username: f.following.username,
        profile: f.following.profile,
      })),
      mutualFollowers: mutualFollowers.map(f => ({
        id: f.follower.id,
        username: f.follower.username,
        profile: f.follower.profile,
      })),
      count: {
        following: mutualFollowing.length,
        followers: mutualFollowers.length,
      },
    };
  }

  /**
   * Get follower/following counts for a user
   */
  async getFollowCounts(userId: string) {
    const [followerCount, followingCount] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      followerCount,
      followingCount,
    };
  }

  /**
   * Get suggested users based on network (who your followers follow)
   */
  async getSuggestedFromNetwork(userId: string, limit: number = 10) {
    // Get users that the people you follow also follow
    const suggestions = await this.prisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.username,
        COUNT(DISTINCT f1.follower_id) as mutual_followers,
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
      GROUP BY u.id, u.username, p.avatar_url, p.full_name, p.bio, p.follower_count
      ORDER BY mutual_followers DESC, p.follower_count DESC
      LIMIT ${limit}
    `;

    return suggestions.map(s => ({
      id: s.id,
      username: s.username,
      profile: {
        avatarUrl: s.avatar_url,
        fullName: s.full_name,
        bio: s.bio,
        followerCount: s.follower_count,
      },
      mutualFollowers: parseInt(s.mutual_followers),
    }));
  }
}
