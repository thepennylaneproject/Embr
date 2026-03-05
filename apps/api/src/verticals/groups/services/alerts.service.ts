import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { CreateAlertDto, AlertUrgency } from '../dto/organizing.dto';
import { GroupMemberRole } from '../dto/group.dto';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(groupId: string, userId: string, dto: CreateAlertDto) {
    await this.assertModOrAdmin(groupId, userId);

    const alert = await this.prisma.actionAlert.create({
      data: {
        groupId,
        authorId: userId,
        title: dto.title,
        body: dto.body,
        urgency: (dto.urgency ?? AlertUrgency.NORMAL) as any,
        ctaText: dto.ctaText,
        ctaUrl: dto.ctaUrl,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: {
        author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });

    // Notify all group members (batch)
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, userId: { not: userId } },
      select: { userId: true },
    });

    await Promise.all(
      members.map((m) =>
        this.notifications.create({
          userId: m.userId,
          type: 'ACTION_ALERT',
          title: `Alert: ${dto.title}`,
          message: dto.body.slice(0, 120),
          actorId: userId,
          referenceId: alert.id,
          referenceType: 'action_alert',
        }),
      ),
    );

    return alert;
  }

  async findAll(groupId: string, includeInactive = false) {
    const where: any = { groupId };
    if (!includeInactive) where.isActive = true;
    return this.prisma.actionAlert.findMany({
      where,
      orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
  }

  async deactivate(groupId: string, alertId: string, userId: string) {
    await this.assertModOrAdmin(groupId, userId);
    const alert = await this.prisma.actionAlert.findFirst({ where: { id: alertId, groupId } });
    if (!alert) throw new NotFoundException('Alert not found');
    return this.prisma.actionAlert.update({ where: { id: alertId }, data: { isActive: false } });
  }

  private async assertModOrAdmin(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('You must be a group member');
    const roleOrder = { MEMBER: 0, MODERATOR: 1, ADMIN: 2 };
    if (roleOrder[membership.role] < roleOrder[GroupMemberRole.MODERATOR]) {
      throw new ForbiddenException('Only moderators or admins can post alerts');
    }
    return membership;
  }
}
