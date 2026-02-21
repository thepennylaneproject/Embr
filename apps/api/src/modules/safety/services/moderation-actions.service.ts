import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateModerationActionDto,
  QueryModerationActionsDto,
  ActionType,
} from '../dto/safety.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { ActionType as PrismaActionType } from '@prisma/client';

@Injectable()
export class ModerationActionsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new moderation action
   */
  async createAction(moderatorId: string, dto: CreateModerationActionDto) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already banned/suspended
    if ((dto.type as unknown as PrismaActionType) === PrismaActionType.BAN || (dto.type as unknown as PrismaActionType) === PrismaActionType.SUSPENSION) {
      const existingAction = await this.prisma.moderationAction.findFirst({
        where: {
          userId: dto.userId,
          type: { in: [PrismaActionType.BAN, PrismaActionType.SUSPENSION] },
          OR: [
            { expiresAt: null }, // Permanent ban
            { expiresAt: { gte: new Date() } }, // Active suspension
          ],
        },
      });

      if (existingAction) {
        throw new BadRequestException(
          `User is already ${existingAction.type === PrismaActionType.BAN ? 'banned' : 'suspended'}`,
        );
      }
    }

    // Calculate expiration date for suspensions
    let expiresAt: Date | null = null;
    if ((dto.type as unknown as PrismaActionType) === PrismaActionType.SUSPENSION && dto.duration) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + dto.duration);
    }

    // Create moderation action
    const action = await this.prisma.moderationAction.create({
      data: {
        userId: dto.userId,
        moderatorId,
        type: dto.type as unknown as PrismaActionType,
        reason: dto.reason,
        duration: dto.duration,
        postId: dto.postId,
        commentId: dto.commentId,
        appealable: dto.appealable,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: { select: { displayName: true } },
          },
        },
        moderator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // Execute the action
    await this.executeAction(action);

    // Notify user about action
    if (dto.notifyUser) {
      await this.notifyUser(action);
    }

    // If content removal, handle the content
    if ((dto.type as unknown as PrismaActionType) === PrismaActionType.CONTENT_REMOVAL && dto.postId) {
      await this.removeContent(dto.postId, 'post');
    }

    return action;
  }

  /**
   * Get moderation actions with filters
   */
  async getActions(query: QueryModerationActionsDto) {
    const { page = 1, limit = 20, type, userId, activeOnly } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) {
      where.type = type as unknown as PrismaActionType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (activeOnly) {
      where.OR = [
        { expiresAt: null }, // Permanent
        { expiresAt: { gte: new Date() } }, // Not expired yet
      ];
    }

    const [actions, total] = await Promise.all([
      this.prisma.moderationAction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
          moderator: {
            select: {
              id: true,
              username: true,
            },
          },
          appeals: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.moderationAction.count({ where }),
    ]);

    return {
      actions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single moderation action
   */
  async getActionById(actionId: string) {
    const action = await this.prisma.moderationAction.findUnique({
      where: { id: actionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: { select: { displayName: true, avatarUrl: true } },
            _count: {
              select: {
                moderationActions: true,
                reportsReceived: true,
              },
            },
          },
        },
        moderator: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true } },
          },
        },
        appeals: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!action) {
      throw new NotFoundException('Moderation action not found');
    }

    return action;
  }

  /**
   * Revoke a moderation action
   */
  async revokeAction(actionId: string, moderatorId: string, reason: string) {
    const action = await this.prisma.moderationAction.findUnique({
      where: { id: actionId },
      include: { user: true },
    });

    if (!action) {
      throw new NotFoundException('Moderation action not found');
    }

    // Check if already expired
    if (action.expiresAt && action.expiresAt < new Date()) {
      throw new BadRequestException('Action has already expired');
    }

    // Set expiration to now
    const updatedAction = await this.prisma.moderationAction.update({
      where: { id: actionId },
      data: {
        expiresAt: new Date(),
        reason: `${action.reason}\n\nREVOKED: ${reason}`,
      },
    });

    // Reverse the action
    await this.reverseAction(action);

    // Notify user
    await this.notificationsService.create({
      userId: action.userId,
      type: 'moderation_revoked',
      title: 'Action Revoked',
      body: `Your ${action.type} has been revoked`,
      metadata: { actionId: action.id, reason },
    });

    return updatedAction;
  }

  /**
   * Get user's moderation history
   */
  async getUserHistory(userId: string) {
    const actions = await this.prisma.moderationAction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        moderator: {
          select: {
            id: true,
            username: true,
          },
        },
        appeals: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const warnings = actions.filter((a) => a.type === PrismaActionType.WARNING).length;
    const suspensions = actions.filter((a) => a.type === PrismaActionType.SUSPENSION).length;
    const bans = actions.filter((a) => a.type === PrismaActionType.BAN).length;
    const contentRemovals = actions.filter((a) => a.type === PrismaActionType.CONTENT_REMOVAL).length;

    return {
      actions,
      summary: {
        total: actions.length,
        warnings,
        suspensions,
        bans,
        contentRemovals,
      },
    };
  }

  /**
   * Check if user is currently restricted
   */
  async checkUserRestriction(userId: string) {
    const activeActions = await this.prisma.moderationAction.findMany({
      where: {
        userId,
        type: { in: [PrismaActionType.BAN, PrismaActionType.SUSPENSION] },
        OR: [
          { expiresAt: null }, // Permanent
          { expiresAt: { gte: new Date() } }, // Active
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (activeActions.length === 0) {
      return {
        restricted: false,
        action: null,
      };
    }

    const action = activeActions[0];

    return {
      restricted: true,
      action: {
        id: action.id,
        type: action.type,
        reason: action.reason,
        expiresAt: action.expiresAt,
        appealable: action.appealable,
      },
    };
  }

  /**
   * Clean up expired actions (run as cron job)
   */
  async cleanupExpiredActions() {
    const expiredActions = await this.prisma.moderationAction.findMany({
      where: {
        expiresAt: { lte: new Date() },
        type: { in: [PrismaActionType.SUSPENSION] },
      },
    });

    for (const action of expiredActions) {
      await this.reverseAction(action);
    }

    return { cleaned: expiredActions.length };
  }

  /**
   * Get moderation statistics
   */
  async getStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalActions,
      actionsByType,
      totalWarnings,
      totalSuspensions,
      totalBans,
      appealRate,
    ] = await Promise.all([
      this.prisma.moderationAction.count({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.moderationAction.groupBy({
        by: ['type'],
        where: { createdAt: { gte: since } },
        _count: true,
      }),
      this.prisma.moderationAction.count({
        where: {
          type: PrismaActionType.WARNING,
          createdAt: { gte: since },
        },
      }),
      this.prisma.moderationAction.count({
        where: {
          type: PrismaActionType.SUSPENSION,
          createdAt: { gte: since },
        },
      }),
      this.prisma.moderationAction.count({
        where: {
          type: PrismaActionType.BAN,
          createdAt: { gte: since },
        },
      }),
      this.getAppealRate(since),
    ]);

    return {
      period: `Last ${days} days`,
      total: totalActions,
      byType: {
        warnings: totalWarnings,
        suspensions: totalSuspensions,
        bans: totalBans,
        contentRemovals: totalActions - totalWarnings - totalSuspensions - totalBans,
      },
      appealRate,
    };
  }

  /**
   * Private helper methods
   */

  private async executeAction(action: any) {
    switch (action.type) {
      case PrismaActionType.BAN:
      case PrismaActionType.SUSPENSION:
        // Update user status
        await this.prisma.user.update({
          where: { id: action.userId },
          data: {
            suspended: true,
            suspendedUntil: action.expiresAt,
          },
        });
        break;

      case PrismaActionType.CONTENT_REMOVAL:
        // Content removal handled separately
        break;

      case PrismaActionType.WARNING:
        // Warnings are logged only
        break;
    }
  }

  private async reverseAction(action: any) {
    switch (action.type) {
      case PrismaActionType.BAN:
      case PrismaActionType.SUSPENSION:
        await this.prisma.user.update({
          where: { id: action.userId },
          data: {
            suspended: false,
            suspendedUntil: null,
          },
        });
        break;
    }
  }

  private async removeContent(contentId: string, contentType: string) {
    if (contentType === 'post') {
      await this.prisma.post.update({
        where: { id: contentId },
        data: {
          deletedAt: new Date(),
          content: '[Content removed by moderators]',
        },
      });
    }
  }

  private async notifyUser(action: any) {
    const messages = {
      [PrismaActionType.WARNING]: {
        title: '⚠️ Warning Issued',
        body: 'You have received a warning for violating community guidelines',
      },
      [PrismaActionType.SUSPENSION]: {
        title: '⏸️ Account Suspended',
        body: `Your account has been suspended ${action.duration ? `for ${action.duration} days` : 'permanently'}`,
      },
      [PrismaActionType.BAN]: {
        title: '🚫 Account Banned',
        body: 'Your account has been permanently banned',
      },
      [PrismaActionType.CONTENT_REMOVAL]: {
        title: '🗑️ Content Removed',
        body: 'Your content has been removed for violating community guidelines',
      },
    };

    const message = messages[action.type as PrismaActionType];

    await this.notificationsService.create({
      userId: action.userId,
      type: 'moderation_action',
      title: message.title,
      body: `${message.body}\n\nReason: ${action.reason}`,
      metadata: {
        actionId: action.id,
        type: action.type,
        appealable: action.appealable,
      },
    });
  }

  private async getAppealRate(since: Date): Promise<number> {
    const [totalActions, totalAppeals] = await Promise.all([
      this.prisma.moderationAction.count({
        where: {
          createdAt: { gte: since },
          appealable: true,
        },
      }),
      this.prisma.appeal.count({
        where: {
          createdAt: { gte: since },
        },
      }),
    ]);

    return totalActions > 0 ? Math.round((totalAppeals / totalActions) * 100) : 0;
  }
}
