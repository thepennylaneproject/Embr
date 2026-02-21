import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserRole as PrismaUserRole,
  AppealStatus as PrismaAppealStatus,
} from '@prisma/client';
import {
  CreateAppealDto,
  UpdateAppealDto,
  QueryAppealsDto,
  AppealStatus,
} from '../dto/safety.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { ModerationActionsService } from './moderation-actions.service';

@Injectable()
export class AppealsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private moderationActionsService: ModerationActionsService,
  ) {}

  /**
   * Create a new appeal
   */
  async createAppeal(userId: string, dto: CreateAppealDto) {
    // Get the moderation action
    const action = await this.prisma.moderationAction.findUnique({
      where: { id: dto.actionId },
      include: { user: true },
    });

    if (!action) {
      throw new NotFoundException('Moderation action not found');
    }

    // Check if user is the affected user
    if (action.userId !== userId) {
      throw new ForbiddenException('You can only appeal actions against your account');
    }

    // Check if action is appealable
    if (!action.appealable) {
      throw new BadRequestException('This action cannot be appealed');
    }

    // Check if already appealed
    const existingAppeal = await this.prisma.appeal.findFirst({
      where: {
        actionId: dto.actionId,
        userId,
      },
    });

    if (existingAppeal) {
      throw new BadRequestException('You have already appealed this action');
    }

    // Create appeal
    const appeal = await this.prisma.appeal.create({
      data: {
        actionId: dto.actionId,
        userId,
        reason: dto.reason,
        status: PrismaAppealStatus.PENDING,
      },
      include: {
        action: {
          include: {
            moderator: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Notify moderators
    await this.notifyModerators(appeal);

    return appeal;
  }

  /**
   * Get appeals with filters
   */
  async getAppeals(query: QueryAppealsDto) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status as unknown as PrismaAppealStatus;
    }

    const [appeals, total] = await Promise.all([
      this.prisma.appeal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
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
          action: {
            include: {
              moderator: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.appeal.count({ where }),
    ]);

    return {
      appeals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single appeal
   */
  async getAppealById(appealId: string) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                moderationActions: true,
                reportsReceived: true,
              },
            },
          },
        },
        action: {
          include: {
            moderator: {
              select: {
                id: true,
                username: true,
              },
            },
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

    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    return appeal;
  }

  /**
   * Update appeal status (moderator action)
   */
  async updateAppeal(
    appealId: string,
    moderatorId: string,
    dto: UpdateAppealDto,
  ) {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        action: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    // Check if already resolved
    if (
      appeal.status === PrismaAppealStatus.APPROVED ||
      appeal.status === PrismaAppealStatus.DENIED
    ) {
      throw new BadRequestException('Appeal has already been resolved');
    }

    // Update appeal
    const updatedAppeal = await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: dto.status as unknown as PrismaAppealStatus,
        reviewNote: dto.reviewNote,
        reviewerId: moderatorId,
        resolvedAt: new Date(),
      },
      include: {
        user: true,
        action: true,
      },
    });

    // If approved, revoke the moderation action
    if ((dto.status as unknown as PrismaAppealStatus) === PrismaAppealStatus.APPROVED) {
      await this.moderationActionsService.revokeAction(
        appeal.action.id,
        moderatorId,
        'Appeal approved',
      );
    }

    // Notify user
    await this.notificationsService.create({
      userId: appeal.userId,
      type: 'appeal_resolved',
      title: (dto.status as unknown as PrismaAppealStatus) === PrismaAppealStatus.APPROVED ? '✅ Appeal Approved' : '❌ Appeal Denied',
      body:
        (dto.status as unknown as PrismaAppealStatus) === PrismaAppealStatus.APPROVED
          ? 'Your appeal has been approved and the action has been revoked'
          : `Your appeal has been denied. ${dto.reviewNote}`,
      metadata: {
        appealId: appeal.id,
        status: dto.status,
      },
    });

    return updatedAppeal;
  }

  /**
   * Get user's appeals
   */
  async getUserAppeals(userId: string) {
    const appeals = await this.prisma.appeal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        action: {
          include: {
            moderator: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const pending = appeals.filter((a) => a.status === PrismaAppealStatus.PENDING).length;
    const underReview = appeals.filter(
      (a) => a.status === PrismaAppealStatus.UNDER_REVIEW,
    ).length;
    const approved = appeals.filter((a) => a.status === PrismaAppealStatus.APPROVED).length;
    const denied = appeals.filter((a) => a.status === PrismaAppealStatus.DENIED).length;

    return {
      appeals,
      summary: {
        total: appeals.length,
        pending,
        underReview,
        approved,
        denied,
        approvalRate: appeals.length > 0 
          ? Math.round((approved / appeals.length) * 100) 
          : 0,
      },
    };
  }

  /**
   * Get appeal statistics
   */
  async getStats(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      totalAppeals,
      pending,
      underReview,
      approved,
      denied,
      avgResolutionTime,
    ] = await Promise.all([
      this.prisma.appeal.count({
        where: { createdAt: { gte: since } },
      }),
      this.prisma.appeal.count({
        where: {
          createdAt: { gte: since },
          status: PrismaAppealStatus.PENDING,
        },
      }),
      this.prisma.appeal.count({
        where: {
          createdAt: { gte: since },
          status: PrismaAppealStatus.UNDER_REVIEW,
        },
      }),
      this.prisma.appeal.count({
        where: {
          createdAt: { gte: since },
          status: PrismaAppealStatus.APPROVED,
        },
      }),
      this.prisma.appeal.count({
        where: {
          createdAt: { gte: since },
          status: PrismaAppealStatus.DENIED,
        },
      }),
      this.getAverageResolutionTime(since),
    ]);

    const resolved = approved + denied;
    const approvalRate = resolved > 0 ? Math.round((approved / resolved) * 100) : 0;

    return {
      period: `Last ${days} days`,
      total: totalAppeals,
      byStatus: {
        pending,
        underReview,
        approved,
        denied,
      },
      approvalRate,
      averageResolutionTime: `${avgResolutionTime} hours`,
    };
  }

  /**
   * Private helper methods
   */

  private async notifyModerators(appeal: any) {
    // Get all moderators and admins
    const moderators = await this.prisma.user.findMany({
      where: {
        role: { in: [PrismaUserRole.ADMIN, PrismaUserRole.MODERATOR] },
      },
      select: { id: true },
    });

    // Create notifications
    await Promise.all(
      moderators.map((mod) =>
        this.notificationsService.create({
          userId: mod.id,
          type: 'appeal_submitted',
          title: '📝 New Appeal Submitted',
          body: `${appeal.user.username} has appealed a ${appeal.action.type}`,
          metadata: {
            appealId: appeal.id,
            actionType: appeal.action.type,
          },
        }),
      ),
    );
  }

  private async getAverageResolutionTime(since: Date): Promise<number> {
    const resolvedAppeals = await this.prisma.appeal.findMany({
      where: {
        createdAt: { gte: since },
        status: { in: [PrismaAppealStatus.APPROVED, PrismaAppealStatus.DENIED] },
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (resolvedAppeals.length === 0) return 0;

    const totalTime = resolvedAppeals.reduce((sum, appeal) => {
      const diff = appeal.resolvedAt!.getTime() - appeal.createdAt.getTime();
      return sum + diff;
    }, 0);

    return Math.round(totalTime / resolvedAppeals.length / (1000 * 60 * 60));
  }
}
