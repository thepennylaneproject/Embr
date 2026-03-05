import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { GroupMemberRole, GroupType } from '../dto/group.dto';

@Injectable()
export class GroupMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async join(groupId: string, userId: string, message?: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.type === GroupType.SECRET) throw new ForbiddenException('Cannot join a secret group directly');

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existing) throw new ConflictException('Already a member');

    if (group.type === GroupType.PUBLIC) {
      const member = await this.prisma.$transaction(async (tx) => {
        const m = await tx.groupMember.create({ data: { groupId, userId, role: GroupMemberRole.MEMBER } });
        await tx.group.update({ where: { id: groupId }, data: { memberCount: { increment: 1 } } });
        return m;
      });
      return { status: 'joined', member };
    }

    const existingRequest = await this.prisma.groupJoinRequest.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (existingRequest) throw new ConflictException('Join request already submitted');

    const request = await this.prisma.groupJoinRequest.create({
      data: { groupId, userId, message },
    });

    const admins = await this.prisma.groupMember.findMany({
      where: { groupId, role: { in: [GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] } },
    });
    for (const admin of admins) {
      await this.notifications.create({
        userId: admin.userId,
        type: 'GROUP_JOIN_REQUEST',
        title: 'New join request',
        message: `Someone wants to join your group`,
        actorId: userId,
        referenceId: groupId,
        referenceType: 'group',
      });
    }

    return { status: 'pending', request };
  }

  async leave(groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.createdById === userId) throw new BadRequestException('Group creator cannot leave; transfer ownership first');

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new NotFoundException('Not a member');

    await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({ where: { groupId_userId: { groupId, userId } } });
      await tx.group.update({ where: { id: groupId }, data: { memberCount: { decrement: 1 } } });
    });
    return { success: true };
  }

  async getMembers(groupId: string, cursor?: string, limit = 20) {
    const actualLimit = Math.min(limit, 100);
    const where: any = { groupId };
    if (cursor) where.id = { lt: cursor };

    const members = await this.prisma.groupMember.findMany({
      where,
      take: actualLimit + 1,
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      include: {
        user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });

    const hasMore = members.length > actualLimit;
    const items = hasMore ? members.slice(0, actualLimit) : members;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async updateMemberRole(groupId: string, actorId: string, targetUserId: string, role: GroupMemberRole) {
    const actorMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!actorMembership || actorMembership.role !== GroupMemberRole.ADMIN) {
      throw new ForbiddenException('Only admins can update member roles');
    }
    return this.prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      data: { role },
    });
  }

  async removeMember(groupId: string, actorId: string, targetUserId: string) {
    const actorMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!actorMembership || actorMembership.role === GroupMemberRole.MEMBER) {
      throw new ForbiddenException('Moderators or admins can remove members');
    }
    const targetMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
    if (!targetMembership) throw new NotFoundException('Member not found');

    const roleOrder = { MEMBER: 0, MODERATOR: 1, ADMIN: 2 };
    if (roleOrder[actorMembership.role] <= roleOrder[targetMembership.role]) {
      throw new ForbiddenException('Cannot remove a member with equal or higher role');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({ where: { groupId_userId: { groupId, userId: targetUserId } } });
      await tx.group.update({ where: { id: groupId }, data: { memberCount: { decrement: 1 } } });
    });
    return { success: true };
  }

  async approveJoinRequest(groupId: string, actorId: string, requestId: string) {
    const actorMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!actorMembership || actorMembership.role === GroupMemberRole.MEMBER) {
      throw new ForbiddenException('Only moderators or admins can approve join requests');
    }

    const request = await this.prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.groupId !== groupId) throw new NotFoundException('Join request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');

    await this.prisma.$transaction(async (tx) => {
      await tx.groupJoinRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } });
      await tx.groupMember.create({ data: { groupId, userId: request.userId, role: GroupMemberRole.MEMBER } });
      await tx.group.update({ where: { id: groupId }, data: { memberCount: { increment: 1 } } });
    });

    await this.notifications.create({
      userId: request.userId,
      type: 'GROUP_INVITE',
      title: 'Join request approved',
      message: `Your request to join the group was approved`,
      referenceId: groupId,
      referenceType: 'group',
    });

    return { success: true };
  }

  async rejectJoinRequest(groupId: string, actorId: string, requestId: string) {
    const actorMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!actorMembership || actorMembership.role === GroupMemberRole.MEMBER) {
      throw new ForbiddenException('Only moderators or admins can reject join requests');
    }

    const request = await this.prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.groupId !== groupId) throw new NotFoundException('Join request not found');

    await this.prisma.groupJoinRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
    return { success: true };
  }

  async getJoinRequests(groupId: string, actorId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: actorId } },
    });
    if (!membership || membership.role === GroupMemberRole.MEMBER) {
      throw new ForbiddenException('Only moderators or admins can view join requests');
    }
    return this.prisma.groupJoinRequest.findMany({
      where: { groupId, status: 'PENDING' },
      include: {
        user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async inviteMember(groupId: string, inviterId: string, inviteeId: string) {
    const inviterMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: inviterId } },
    });
    if (!inviterMembership) throw new ForbiddenException('You must be a member to invite others');

    const existingMembership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: inviteeId } },
    });
    if (existingMembership) throw new ConflictException('User is already a member');

    const invite = await this.prisma.groupInvite.create({
      data: { groupId, inviterId, inviteeId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    await this.notifications.create({
      userId: inviteeId,
      type: 'GROUP_INVITE',
      title: 'Group invitation',
      message: `You have been invited to join a group`,
      actorId: inviterId,
      referenceId: groupId,
      referenceType: 'group',
    });

    return invite;
  }

  async acceptInvite(inviteToken: string, userId: string) {
    const invite = await this.prisma.groupInvite.findUnique({ where: { token: inviteToken } });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.inviteeId !== userId) throw new ForbiddenException('This invite is not for you');
    if (invite.status !== 'PENDING') throw new BadRequestException('Invite already used');
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new BadRequestException('Invite has expired');

    await this.prisma.$transaction(async (tx) => {
      await tx.groupInvite.update({ where: { id: invite.id }, data: { status: 'ACCEPTED' } });
      await tx.groupMember.create({ data: { groupId: invite.groupId, userId, role: GroupMemberRole.MEMBER } });
      await tx.group.update({ where: { id: invite.groupId }, data: { memberCount: { increment: 1 } } });
    });

    return { success: true, groupId: invite.groupId };
  }
}
