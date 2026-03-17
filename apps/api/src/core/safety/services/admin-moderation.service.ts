/**
 * Admin Moderation Dashboard Service
 * Provides comprehensive tools for administrators to manage content and users
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole } from '@prisma/client';
import { sanitizeAdminUser } from '../../../common/utils/user-sanitizer';

export interface ModerationStats {
  pendingReports: number;
  activeSuspensions: number;
  pendingAppeals: number;
  reportsToday: number;
  moderationActionsToday: number;
}

export interface ReportWithDetails {
  id: string;
  reportedContent: 'POST' | 'COMMENT' | 'USER';
  contentId: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  reporter: { id: string; username: string };
  reportedUser: { id: string; username: string };
  createdAt: Date;
  content?: any;
}

@Injectable()
export class AdminModerationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify user is admin
   */
  private async verifyAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can access this resource');
    }
  }

  /**
   * Get moderation dashboard statistics
   */
  async getDashboardStats(userId: string): Promise<ModerationStats> {
    await this.verifyAdmin(userId);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      pendingReports,
      activeSuspensions,
      pendingAppeals,
      reportsToday,
      moderationActionsToday,
    ] = await Promise.all([
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({
        where: { suspended: true, suspendedUntil: { gt: new Date() } },
      }),
      this.prisma.appeal.count({ where: { status: 'PENDING' } }),
      this.prisma.report.count({
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.moderationAction.count({
        where: { createdAt: { gte: startOfDay } },
      }),
    ]);

    return {
      pendingReports,
      activeSuspensions,
      pendingAppeals,
      reportsToday,
      moderationActionsToday,
    };
  }

  /**
   * Get all pending reports (paginated)
   */
  async getPendingReports(
    userId: string,
    params: { page: number; limit: number },
  ) {
    await this.verifyAdmin(userId);

    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
        },
      }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      data: reports,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resolve a report (take moderation action)
   */
  async resolveReport(
    reportId: string,
    adminId: string,
    action: 'APPROVE' | 'DISMISS',
    reason: string,
    suspensionDays?: number, // Days to suspend user if action is approve
  ) {
    await this.verifyAdmin(adminId);

    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { reportedUser: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('This report has already been resolved');
    }

    // Update report status
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: (action === 'APPROVE' ? 'RESOLVED' : 'DISMISSED') as any },
    });

    // Create moderation action record
    if (action === 'APPROVE') {
      const suspendUntil = suspensionDays
        ? new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

      // Suspend user
      await this.prisma.user.update({
        where: { id: report.reportedUserId },
        data: {
          suspended: true,
          suspendedUntil: suspendUntil as any,
        },
      });

      // Log moderation action
      await this.prisma.moderationAction.create({
        data: {
          targetUserId: report.reportedUserId,
          moderatorId: adminId,
          action: 'SUSPEND' as any,
          reason,
          duration: suspensionDays || 7,
        } as any,
      });
    }

    // Sanitize the nested reportedUser to prevent credential leakage.
    const safeReport = {
      ...report,
      reportedUser: report.reportedUser ? sanitizeAdminUser(report.reportedUser) : null,
    };

    return {
      message: `Report ${action === 'APPROVE' ? 'approved and action taken' : 'dismissed'}`,
      report: safeReport,
    };
  }

  /**
   * Manually suspend a user
   */
  async suspendUser(
    userId: string,
    adminId: string,
    suspensionDays: number,
    reason: string,
  ) {
    await this.verifyAdmin(adminId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const suspendUntil = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: { suspended: true, suspendedUntil: suspendUntil as any },
    });

    await this.prisma.moderationAction.create({
      data: {
        targetUserId: userId,
        moderatorId: adminId,
        action: 'SUSPEND' as any,
        reason,
        duration: suspensionDays,
      } as any,
    });

    return { message: `User suspended for ${suspensionDays} days`, user: sanitizeAdminUser(user) };
  }

  /**
   * Unsuspend a user
   */
  async unsuspendUser(userId: string, adminId: string) {
    await this.verifyAdmin(adminId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { suspended: false, suspendedUntil: null },
    });

    return { message: 'User unsuspended', user: sanitizeAdminUser(user) };
  }

  /**
   * Delete content (post or comment)
   */
  async deleteContent(
    contentType: 'POST' | 'COMMENT',
    contentId: string,
    adminId: string,
    reason: string,
  ) {
    await this.verifyAdmin(adminId);

    if (contentType === 'POST') {
      const post = await this.prisma.post.findUnique({ where: { id: contentId } });
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      await this.prisma.post.update({
        where: { id: contentId },
        data: { deletedAt: new Date() },
      });

      await this.prisma.moderationAction.create({
        data: {
          targetUserId: post.authorId,
          moderatorId: adminId,
          action: 'REMOVE_CONTENT' as any,
          reason,
        } as any,
      });
    } else {
      const comment = await this.prisma.comment.findUnique({
        where: { id: contentId },
      });
      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      await this.prisma.comment.update({
        where: { id: contentId },
        data: { deletedAt: new Date() },
      });

      await this.prisma.moderationAction.create({
        data: {
          targetUserId: comment.authorId,
          moderatorId: adminId,
          action: 'REMOVE_CONTENT' as any,
          reason,
        } as any,
      });
    }

    return { message: `${contentType.toLowerCase()} deleted` };
  }

  /**
   * Get user activity for moderation
   */
  async getUserModeration(userId: string, adminId: string) {
    await this.verifyAdmin(adminId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: { select: { id: true, createdAt: true, deletedAt: true } },
        comments: { select: { id: true, createdAt: true, deletedAt: true } },
        reports: { select: { id: true, status: true, createdAt: true } },
        reportsReceived: { select: { id: true, status: true, createdAt: true } },
        moderationActions: { select: { id: true, action: true, createdAt: true } as any },
      },
    }) as any;

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        suspended: user.suspended,
        suspendedUntil: user.suspendedUntil,
      },
      stats: {
        totalPosts: user.posts.length,
        deletedPosts: user.posts.filter((p) => p.deletedAt).length,
        totalComments: user.comments.length,
        deletedComments: user.comments.filter((c) => c.deletedAt).length,
        reportsSubmitted: user.reports.length,
        reportsReceived: user.reportsReceived.length,
        moderationActions: user.moderationActions.length,
      },
      recentPosts: user.posts.slice(0, 5),
      recentReports: user.reportsReceived.slice(0, 5),
      moderationHistory: user.moderationActions.slice(0, 10),
    };
  }

  /**
   * Get all pending appeals
   */
  async getPendingAppeals(userId: string, params: { page: number; limit: number }) {
    await this.verifyAdmin(userId);

    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [appeals, total] = await Promise.all([
      this.prisma.appeal.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          moderationAction: true,
        } as any,
      }),
      this.prisma.appeal.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      data: appeals,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Resolve an appeal
   */
  async resolveAppeal(
    appealId: string,
    adminId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason: string,
  ) {
    await this.verifyAdmin(adminId);

    const appeal = await this.prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) {
      throw new NotFoundException('Appeal not found');
    }

    await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: decision as any,
        reviewerId: adminId,
        reviewedAt: new Date(),
        reviewNote: reason,
      } as any,
    });

    // If approved, lift suspension
    if (decision === 'APPROVED') {
      await this.prisma.user.update({
        where: { id: appeal.userId },
        data: { suspended: false, suspendedUntil: null },
      });
    }

    return { message: `Appeal ${decision.toLowerCase()}`, appeal };
  }
}
