import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/database/prisma.service';
import { BlockingService } from '../../../../core/safety/services/blocking.service';
import { NOTIFICATION_TYPES } from '../../../../core/notifications/notifications.constants';
import {
  FollowUserDto,
  GetFollowersDto,
  GetFollowingDto,
  CheckFollowDto,
  GetMutualConnectionsDto,
  BatchFollowCheckDto
} from '../dto/follow.dto';
import { sanitizePublicProfile } from '../../../../common/utils/user-sanitizer';

@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(
    private prisma: PrismaService,
    private blockingService: BlockingService,
  ) {}

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

    // Check if user is blocked
    const isBlocked = await this.blockingService.isBlocked(followerId, dto.followingId);
    if (isBlocked) {
      throw new ForbiddenException('Cannot follow a blocked user or a user who has blocked you');
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

    // Audit log successful follow
    this.logger.log(
      `User ${followerId} followed user ${dto.followingId}`,
      'FOLLOW_ACTION',
    );

    // Create notification for followed user
    await this.prisma.notification.create({
      data: {
        userId: dto.followingId,
        type: NOTIFICATION_TYPES.NEW_FOLLOWER,
        actorId: followerId,
        message: 'started following you',
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
        profile: sanitizePublicProfile(follow.following.profile),
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

    // Audit log successful unfollow
    this.logger.log(
      `User ${followerId} unfollowed user ${followingId}`,
      'UNFOLLOW_ACTION',
    );

    return { message: 'Successfully unfollowed user' };
  }

  /**
   * Get user's followers with pagination
   * @param userId - User whose followers to retrieve
   * @param requesterId - User making the request (for privacy enforcement)
   * @param dto - Pagination params
   */
  async getFollowers(userId: string, requesterId: string | null, dto: GetFollowersDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    // Get user profile to check privacy setting
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Enforce privacy: only the user themselves or followers can see the list
    if (user.profile?.isPrivate && requesterId !== userId) {
      // Check if requester is a follower
      if (requesterId) {
        const isFollower = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: requesterId,
              followingId: userId,
            },
          },
        });
        if (!isFollower) {
          throw new ForbiddenException('Follower list is private');
        }
      } else {
        throw new ForbiddenException('Follower list is private');
      }
    }

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
        profile: sanitizePublicProfile(f.follower.profile),
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
   * @param userId - User whose following list to retrieve
   * @param requesterId - User making the request (for privacy enforcement)
   * @param dto - Pagination params
   */
  async getFollowing(userId: string, requesterId: string | null, dto: GetFollowingDto) {
    const { page = 1, limit = 20 } = dto;
    const skip = (page - 1) * limit;

    // Get user profile to check privacy setting
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Enforce privacy: only the user themselves can see the following list
    if (user.profile?.isPrivate && requesterId !== userId) {
      throw new ForbiddenException('Following list is private');
    }

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
        profile: sanitizePublicProfile(f.following.profile),
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
   * Excludes blocked users
   */
  async getMutualConnections(currentUserId: string, dto: GetMutualConnectionsDto) {
    const { userId, limit = 10 } = dto;

    // Get list of blocked users (both directions)
    const blocked = await this.prisma.blockedUser.findMany({
      where: {
        OR: [
          { blockerId: currentUserId },
          { blockedId: currentUserId },
          { blockerId: userId },
          { blockedId: userId },
        ],
      },
      select: {
        blockerId: true,
        blockedId: true,
      },
    });

    const blockedUserIds = new Set<string>();
    blocked.forEach(b => {
      blockedUserIds.add(b.blockerId);
      blockedUserIds.add(b.blockedId);
    });

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
          id: {
            notIn: Array.from(blockedUserIds),
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
          id: {
            notIn: Array.from(blockedUserIds),
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
        profile: sanitizePublicProfile(f.following.profile),
      })),
      mutualFollowers: mutualFollowers.map(f => ({
        id: f.follower.id,
        username: f.follower.username,
        profile: sanitizePublicProfile(f.follower.profile),
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
   * Excludes blocked users
   */
  async getSuggestedFromNetwork(userId: string, limit: number = 10) {
    // Get users that the people you follow also follow
    // Excludes blocked users (both directions)
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
      AND NOT EXISTS (
        SELECT 1 FROM blocked_users
        WHERE (blocker_id = ${userId} AND blocked_id = u.id)
           OR (blocker_id = u.id AND blocked_id = ${userId})
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
