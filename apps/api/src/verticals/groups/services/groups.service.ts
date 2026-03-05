import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import {
  CreateGroupDto,
  UpdateGroupDto,
  GroupSearchDto,
  GroupType,
  GroupMemberRole,
} from '../dto/group.dto';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateGroupDto) {
    const existing = await this.prisma.group.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('A group with that slug already exists');

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        coverUrl: dto.coverUrl,
        avatarUrl: dto.avatarUrl,
        type: dto.type ?? GroupType.PUBLIC,
        category: dto.category,
        tags: dto.tags ?? [],
        rules: dto.rules ?? [],
        createdById: userId,
        memberCount: 1,
        members: {
          create: { userId, role: GroupMemberRole.ADMIN },
        },
      },
      include: { createdBy: { select: { id: true, username: true } } },
    });
    return group;
  }

  async findAll(dto: GroupSearchDto) {
    const limit = Math.min(dto.limit ?? 20, 50);
    const where: any = {
      deletedAt: null,
      type: { not: GroupType.SECRET },
    };
    if (dto.q) {
      where.OR = [
        { name: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ];
    }
    if (dto.type) where.type = dto.type;
    if (dto.category) where.category = dto.category;
    if (dto.cursor) where.id = { lt: dto.cursor };

    const groups = await this.prisma.group.findMany({
      where,
      orderBy: { memberCount: 'desc' },
      take: limit + 1,
      include: {
        createdBy: { select: { id: true, username: true, profile: { select: { avatarUrl: true } } } },
        _count: { select: { members: true } },
      },
    });

    const hasMore = groups.length > limit;
    const items = hasMore ? groups.slice(0, limit) : groups;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async findBySlug(slug: string, userId?: string) {
    const group = await this.prisma.group.findFirst({
      where: { slug, deletedAt: null },
      include: {
        createdBy: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        _count: { select: { members: true, posts: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    if (group.type === GroupType.SECRET && userId) {
      const isMember = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } },
      });
      if (!isMember) throw new ForbiddenException('This group is secret');
    }
    let membershipRole: string | null = null;
    if (userId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } },
      });
      membershipRole = membership?.role ?? null;
    }
    return { ...group, membershipRole };
  }

  async findById(groupId: string) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, deletedAt: null } });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async update(groupId: string, userId: string, dto: UpdateGroupDto) {
    await this.assertAdminOrModerator(groupId, userId, GroupMemberRole.ADMIN);
    return this.prisma.group.update({
      where: { id: groupId },
      data: dto,
    });
  }

  async delete(groupId: string, userId: string) {
    await this.assertAdminOrModerator(groupId, userId, GroupMemberRole.ADMIN);
    return this.prisma.group.update({
      where: { id: groupId },
      data: { deletedAt: new Date() },
    });
  }

  async getUserGroups(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.group, role: m.role }));
  }

  async assertAdminOrModerator(groupId: string, userId: string, minRole: GroupMemberRole = GroupMemberRole.MODERATOR) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this group');
    const roleOrder = { MEMBER: 0, MODERATOR: 1, ADMIN: 2 };
    if (roleOrder[membership.role] < roleOrder[minRole]) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership;
  }

  async assertMember(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new ForbiddenException('You must be a member of this group');
    return membership;
  }
}
