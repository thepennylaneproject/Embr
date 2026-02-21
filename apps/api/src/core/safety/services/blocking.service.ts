import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockUserDto, MuteUserDto, MuteKeywordDto } from '../dto/safety.dto';

@Injectable()
export class BlockingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Block a user
   */
  async blockUser(userId: string, dto: BlockUserDto) {
    // Can't block yourself
    if (userId === dto.blockedUserId) {
      throw new BadRequestException('You cannot block yourself');
    }

    // Check if user exists
    const userToBlock = await this.prisma.user.findUnique({
      where: { id: dto.blockedUserId },
    });

    if (!userToBlock) {
      throw new NotFoundException('User not found');
    }

    // Check if already blocked
    const existing = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: dto.blockedUserId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already blocked');
    }

    // Create block record
    const block = await this.prisma.blockedUser.create({
      data: {
        blockerId: userId,
        blockedId: dto.blockedUserId,
        reason: dto.reason,
      },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // Remove follow relationships if they exist
    await Promise.all([
      this.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: dto.blockedUserId },
            { followerId: dto.blockedUserId, followingId: userId },
          ],
        },
      }),
      // Delete pending DM conversations
      this.prisma.conversation.deleteMany({
        where: {
          OR: [
            { participant1Id: userId, participant2Id: dto.blockedUserId },
            { participant1Id: dto.blockedUserId, participant2Id: userId },
          ],
        },
      }),
    ]);

    return block;
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string) {
    const block = await this.prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: blockedUserId,
        },
      },
    });

    if (!block) {
      throw new NotFoundException('Block not found');
    }

    await this.prisma.blockedUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: blockedUserId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [blocks, total] = await Promise.all([
      this.prisma.blockedUser.findMany({
        where: { blockerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          blocked: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.blockedUser.count({ where: { blockerId: userId } }),
    ]);

    return {
      blocks: blocks.map((b) => ({
        id: b.id,
        user: b.blocked,
        reason: b.reason,
        blockedAt: b.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if a user is blocked
   */
  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const block = await this.prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId },
        ],
      },
    });

    return !!block;
  }

  /**
   * Mute a user (temporary or permanent)
   */
  async muteUser(userId: string, dto: MuteUserDto) {
    if (userId === dto.mutedUserId) {
      throw new BadRequestException('You cannot mute yourself');
    }

    // Check if user exists
    const userToMute = await this.prisma.user.findUnique({
      where: { id: dto.mutedUserId },
    });

    if (!userToMute) {
      throw new NotFoundException('User not found');
    }

    // Check if already muted
    const existing = await this.prisma.mutedUser.findUnique({
      where: {
        muterId_mutedId: {
          muterId: userId,
          mutedId: dto.mutedUserId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('User is already muted');
    }

    // Calculate expiration
    let expiresAt: Date | null = null;
    if (dto.duration) {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + dto.duration);
    }

    const mute = await this.prisma.mutedUser.create({
      data: {
        muterId: userId,
        mutedId: dto.mutedUserId,
        expiresAt,
      },
      include: {
        muted: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    return mute;
  }

  /**
   * Unmute a user
   */
  async unmuteUser(userId: string, mutedUserId: string) {
    const mute = await this.prisma.mutedUser.findUnique({
      where: {
        muterId_mutedId: {
          muterId: userId,
          mutedId: mutedUserId,
        },
      },
    });

    if (!mute) {
      throw new NotFoundException('Mute not found');
    }

    await this.prisma.mutedUser.delete({
      where: {
        muterId_mutedId: {
          muterId: userId,
          mutedId: mutedUserId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Get list of muted users
   */
  async getMutedUsers(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [mutes, total] = await Promise.all([
      this.prisma.mutedUser.findMany({
        where: { muterId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          muted: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.mutedUser.count({ where: { muterId: userId } }),
    ]);

    return {
      mutes: mutes.map((m) => ({
        id: m.id,
        user: m.muted,
        expiresAt: m.expiresAt,
        mutedAt: m.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if a user is muted
   */
  async isMuted(userId: string, targetUserId: string): Promise<boolean> {
    const mute = await this.prisma.mutedUser.findUnique({
      where: {
        muterId_mutedId: {
          muterId: userId,
          mutedId: targetUserId,
        },
      },
    });

    // Check if expired
    if (mute && mute.expiresAt && mute.expiresAt < new Date()) {
      await this.prisma.mutedUser.delete({
        where: { id: mute.id },
      });
      return false;
    }

    return !!mute;
  }

  /**
   * Add a muted keyword
   */
  async addMutedKeyword(userId: string, dto: MuteKeywordDto) {
    // Check if already exists
    const existing = await this.prisma.mutedKeyword.findFirst({
      where: {
        userId,
        keyword: dto.caseSensitive
          ? dto.keyword
          : { equals: dto.keyword, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new BadRequestException('Keyword already muted');
    }

    const mutedKeyword = await this.prisma.mutedKeyword.create({
      data: {
        userId,
        keyword: dto.keyword,
        caseSensitive: dto.caseSensitive,
      },
    });

    return mutedKeyword;
  }

  /**
   * Remove a muted keyword
   */
  async removeMutedKeyword(userId: string, keywordId: string) {
    const keyword = await this.prisma.mutedKeyword.findUnique({
      where: { id: keywordId },
    });

    if (!keyword || keyword.userId !== userId) {
      throw new NotFoundException('Muted keyword not found');
    }

    await this.prisma.mutedKeyword.delete({
      where: { id: keywordId },
    });

    return { success: true };
  }

  /**
   * Get all muted keywords for a user
   */
  async getMutedKeywords(userId: string) {
    const keywords = await this.prisma.mutedKeyword.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return keywords;
  }

  /**
   * Check if content contains muted keywords
   */
  async checkMutedContent(userId: string, content: string): Promise<boolean> {
    const keywords = await this.prisma.mutedKeyword.findMany({
      where: { userId },
    });

    return keywords.some((kw) => {
      if (kw.caseSensitive) {
        return content.includes(kw.keyword);
      } else {
        return content.toLowerCase().includes(kw.keyword.toLowerCase());
      }
    });
  }

  /**
   * Filter content for a user (remove blocked/muted users' content)
   */
  async filterContent(userId: string, contentItems: any[]) {
    // Get blocked and muted user IDs
    const [blocked, muted] = await Promise.all([
      this.prisma.blockedUser.findMany({
        where: {
          OR: [{ blockerId: userId }, { blockedId: userId }],
        },
        select: {
          blockerId: true,
          blockedId: true,
        },
      }),
      this.prisma.mutedUser.findMany({
        where: {
          muterId: userId,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        select: {
          mutedId: true,
        },
      }),
    ]);

    const blockedUserIds = new Set([
      ...blocked.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId)),
    ]);

    const mutedUserIds = new Set(muted.map((m) => m.mutedId));

    // Filter out content from blocked/muted users
    return contentItems.filter((item) => {
      const authorId = item.authorId || item.userId;
      return !blockedUserIds.has(authorId) && !mutedUserIds.has(authorId);
    });
  }

  /**
   * Clean up expired mutes (run as cron job)
   */
  async cleanupExpiredMutes() {
    const result = await this.prisma.mutedUser.deleteMany({
      where: {
        expiresAt: { lte: new Date() },
      },
    });

    return { cleaned: result.count };
  }
}
