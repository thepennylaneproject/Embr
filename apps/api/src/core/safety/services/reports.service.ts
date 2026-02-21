import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateReportDto,
  UpdateReportDto,
  QueryReportsDto,
  ReportStatus,
  ReportEntityType,
} from '../dto/safety.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  UserRole as PrismaUserRole,
  ReportStatus as PrismaReportStatus,
  ReportReason as PrismaReportReason,
} from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new report for content or user
   */
  async createReport(reporterId: string, dto: CreateReportDto) {
    // Validate entity exists
    await this.validateEntityExists(dto.entityType, dto.entityId);

    // Check if user already reported this entity
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        ...(dto.entityType === ReportEntityType.POST && {
          reportedPostId: dto.entityId,
        }),
        ...(dto.entityType === ReportEntityType.USER && {
          reportedUserId: dto.entityId,
        }),
        ...(dto.entityType === ReportEntityType.COMMENT && {
          reportedCommentId: dto.entityId,
        }),
        status: {
          in: [PrismaReportStatus.PENDING, PrismaReportStatus.UNDER_REVIEW],
        },
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this content');
    }

    // Create report
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reason: dto.reason as unknown as PrismaReportReason,
        description: dto.description,
        status: PrismaReportStatus.PENDING,
        ...(dto.entityType === ReportEntityType.POST && {
          reportedPostId: dto.entityId,
        }),
        ...(dto.entityType === ReportEntityType.USER && {
          reportedUserId: dto.entityId,
        }),
        ...(dto.entityType === ReportEntityType.COMMENT && {
          reportedCommentId: dto.entityId,
        }),
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            profile: { select: { avatarUrl: true } },
          },
        },
        reportedPost: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
          },
        },
      },
    });

    // Notify moderators about new report
    await this.notifyModerators('new_report', report.id);

    // Auto-escalate if multiple reports on same entity
    await this.checkAutoEscalation(dto.entityType, dto.entityId);

    return report;
  }

  /**
   * Get paginated list of reports with filters
   */
  async getReports(query: QueryReportsDto, moderatorId?: string) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status as unknown as PrismaReportStatus;
    }

    if (query.reason) {
      where.reason = query.reason as unknown as PrismaReportReason;
    }

    if (query.entityType) {
      switch (query.entityType) {
        case ReportEntityType.POST:
          where.reportedPostId = { not: null };
          break;
        case ReportEntityType.USER:
          where.reportedUserId = { not: null };
          break;
        case ReportEntityType.COMMENT:
          where.reportedCommentId = { not: null };
          break;
      }
    }

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
              profile: { select: { avatarUrl: true } },
            },
          },
          reportedUser: {
            select: {
              id: true,
              username: true,
              profile: { select: { avatarUrl: true, displayName: true } },
            },
          },
          reportedPost: {
            select: {
              id: true,
              content: true,
              mediaUrl: true,
              createdAt: true,
            },
          },
          reportedComment: {
            select: {
              id: true,
              content: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single report by ID
   */
  async getReportById(reportId: string, moderatorId?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: { select: { avatarUrl: true, displayName: true } },
          },
        },
        reportedUser: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: { select: { avatarUrl: true, displayName: true } },
            _count: {
              select: {
                reportsReceived: true,
                moderationActions: true,
              },
            },
          },
        },
        reportedPost: {
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                profile: { select: { avatarUrl: true } },
              },
            },
            _count: {
              select: { likes: true, comments: true, reports: true },
            },
          },
        },
        reportedComment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                profile: { select: { avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  /**
   * Update report status (moderator action)
   */
  async updateReport(
    reportId: string,
    moderatorId: string,
    dto: UpdateReportDto,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status === PrismaReportStatus.ACTION_TAKEN || 
        report.status === PrismaReportStatus.DISMISSED) {
      throw new BadRequestException('Report has already been resolved');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status as unknown as PrismaReportStatus,
        action: dto.action,
        reviewerId: moderatorId,
        reviewedAt: new Date(),
      },
      include: {
        reporter: {
          select: { id: true, username: true },
        },
        reportedUser: {
          select: { id: true, username: true },
        },
      },
    });

    // Notify reporter about outcome
    const status = dto.status as unknown as PrismaReportStatus;
    if (status === PrismaReportStatus.ACTION_TAKEN || 
        status === PrismaReportStatus.DISMISSED) {
      await this.notificationsService.create({
        userId: report.reporterId,
        type: 'report_resolved',
        title: 'Report Update',
        body: `Your report has been ${status === PrismaReportStatus.ACTION_TAKEN ? 'acted upon' : 'reviewed'}`,
        metadata: { reportId: report.id, status: dto.status },
      });
    }

    return updatedReport;
  }

  /**
   * Bulk update reports
   */
  async bulkUpdateReports(
    reportIds: string[],
    moderatorId: string,
    dto: UpdateReportDto,
  ) {
    const reports = await this.prisma.report.updateMany({
      where: {
        id: { in: reportIds },
        status: {
          in: [PrismaReportStatus.PENDING, PrismaReportStatus.UNDER_REVIEW],
        },
      },
      data: {
        status: dto.status as unknown as PrismaReportStatus,
        action: dto.action,
        reviewerId: moderatorId,
        reviewedAt: new Date(),
      },
    });

    return { updated: reports.count };
  }

  /**
   * Get moderation queue statistics
   */
  async getQueueStats() {
    const [
      totalPending,
      totalUnderReview,
      totalActionTaken,
      totalDismissed,
      reportsByReason,
      reportsByEntity,
    ] = await Promise.all([
      this.prisma.report.count({ where: { status: PrismaReportStatus.PENDING } }),
      this.prisma.report.count({ where: { status: PrismaReportStatus.UNDER_REVIEW } }),
      this.prisma.report.count({ where: { status: PrismaReportStatus.ACTION_TAKEN } }),
      this.prisma.report.count({ where: { status: PrismaReportStatus.DISMISSED } }),
      this.prisma.report.groupBy({
        by: ['reason'],
        _count: true,
      }),
      this.prisma.report.groupBy({
        by: ['reportedPostId', 'reportedUserId', 'reportedCommentId'],
        _count: true,
      }),
    ]);

    return {
      total: {
        pending: totalPending,
        underReview: totalUnderReview,
        actionTaken: totalActionTaken,
        dismissed: totalDismissed,
      },
      byReason: reportsByReason,
      averageResolutionTime: await this.getAverageResolutionTime(),
    };
  }

  /**
   * Private helper methods
   */

  private async validateEntityExists(
    entityType: ReportEntityType,
    entityId: string,
  ) {
    let exists = false;

    switch (entityType) {
      case ReportEntityType.POST:
        exists = !!(await this.prisma.post.findUnique({
          where: { id: entityId },
        }));
        break;
      case ReportEntityType.USER:
        exists = !!(await this.prisma.user.findUnique({
          where: { id: entityId },
        }));
        break;
      case ReportEntityType.COMMENT:
        exists = !!(await this.prisma.comment.findUnique({
          where: { id: entityId },
        }));
        break;
    }

    if (!exists) {
      throw new NotFoundException(`${entityType} not found`);
    }
  }

  private async checkAutoEscalation(
    entityType: ReportEntityType,
    entityId: string,
  ) {
    const whereClause: any = {
      status: PrismaReportStatus.PENDING,
    };

    switch (entityType) {
      case ReportEntityType.POST:
        whereClause.reportedPostId = entityId;
        break;
      case ReportEntityType.USER:
        whereClause.reportedUserId = entityId;
        break;
      case ReportEntityType.COMMENT:
        whereClause.reportedCommentId = entityId;
        break;
    }

    const reportCount = await this.prisma.report.count({ where: whereClause });

    // Auto-escalate if 5+ reports
    if (reportCount >= 5) {
      await this.prisma.report.updateMany({
        where: whereClause,
        data: { status: PrismaReportStatus.UNDER_REVIEW },
      });

      // High-priority notification to moderators
      await this.notifyModerators('high_priority_report', entityId);
    }
  }

  private async notifyModerators(type: string, entityId: string) {
    // Get all moderators and admins
    const moderators = await this.prisma.user.findMany({
      where: {
        role: { in: [PrismaUserRole.ADMIN, PrismaUserRole.MODERATOR] },
      },
      select: { id: true },
    });

    // Create notifications for all moderators
    await Promise.all(
      moderators.map((mod) =>
        this.notificationsService.create({
          userId: mod.id,
          type: 'moderation_alert',
          title: type === 'high_priority_report' ? '🚨 High Priority Report' : 'New Report',
          body: type === 'high_priority_report' 
            ? 'Multiple reports detected - immediate review needed'
            : 'A new report requires your attention',
          metadata: { entityId },
        }),
      ),
    );
  }

  private async getAverageResolutionTime(): Promise<number> {
    const resolvedReports = await this.prisma.report.findMany({
      where: {
        status: { in: [PrismaReportStatus.ACTION_TAKEN, PrismaReportStatus.DISMISSED] },
        reviewedAt: { not: null },
      },
      select: {
        createdAt: true,
        reviewedAt: true,
      },
      take: 100, // Sample last 100 resolved reports
    });

    if (resolvedReports.length === 0) return 0;

    const totalTime = resolvedReports.reduce((sum, report) => {
      const diff = report.reviewedAt!.getTime() - report.createdAt.getTime();
      return sum + diff;
    }, 0);

    return Math.round(totalTime / resolvedReports.length / (1000 * 60 * 60)); // Hours
  }
}
