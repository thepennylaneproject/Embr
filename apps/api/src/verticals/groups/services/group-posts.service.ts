import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { GroupsService } from './groups.service';
import { GroupType } from '../dto/group.dto';

@Injectable()
export class GroupPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async getGroupPosts(groupId: string, userId: string | undefined, cursor?: string, limit = 20) {
    const group = await this.groupsService.findById(groupId);

    if (group.type !== GroupType.PUBLIC) {
      if (!userId) throw new ForbiddenException('Login required to view this group');
      await this.groupsService.assertMember(groupId, userId);
    }

    const actualLimit = Math.min(limit, 50);
    const where: any = { groupId, deletedAt: null };
    if (cursor) where.createdAt = { lt: new Date(cursor) };

    const posts = await this.prisma.post.findMany({
      where,
      take: actualLimit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    const hasMore = posts.length > actualLimit;
    const items = hasMore ? posts.slice(0, actualLimit) : posts;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null };
  }

  async createGroupPost(groupId: string, userId: string, content: string, type = 'TEXT', mediaUrl?: string) {
    const group = await this.groupsService.findById(groupId);
    await this.groupsService.assertMember(groupId, userId);

    const post = await this.prisma.$transaction(async (tx) => {
      const p = await tx.post.create({
        data: {
          authorId: userId,
          groupId,
          content,
          type: type as any,
          mediaUrl,
          visibility: 'PUBLIC',
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
      });
      await tx.group.update({ where: { id: groupId }, data: { postCount: { increment: 1 } } });
      return p;
    });

    return post;
  }
}
