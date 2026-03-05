import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { CreateMutualAidPostDto, UpdateMutualAidPostDto, MutualAidSearchDto } from '../dto/mutual-aid.dto';

@Injectable()
export class MutualAidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateMutualAidPostDto) {
    return this.prisma.mutualAidPost.create({
      data: {
        authorId: userId,
        type: dto.type as any,
        category: dto.category as any,
        title: dto.title,
        description: dto.description,
        quantity: dto.quantity,
        location: dto.location,
        isRemote: dto.isRemote ?? false,
        urgency: dto.urgency as any ?? 'MEDIUM',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        tags: dto.tags ?? [],
        groupId: dto.groupId,
      },
      include: {
        author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
  }

  async findAll(dto: MutualAidSearchDto) {
    const limit = Math.min(dto.limit ?? 20, 50);
    const where: any = { deletedAt: null, status: { not: 'EXPIRED' } };

    if (dto.q) {
      where.OR = [
        { title: { contains: dto.q, mode: 'insensitive' } },
        { description: { contains: dto.q, mode: 'insensitive' } },
      ];
    }
    if (dto.type) where.type = dto.type;
    if (dto.category) where.category = dto.category;
    if (dto.urgency) where.urgency = dto.urgency;
    if (dto.groupId) where.groupId = dto.groupId;
    if (dto.cursor) where.createdAt = { lt: new Date(dto.cursor) };

    const posts = await this.prisma.mutualAidPost.findMany({
      where,
      take: limit + 1,
      orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        _count: { select: { responses: true } },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null };
  }

  async findOne(id: string) {
    const post = await this.prisma.mutualAidPost.findFirst({
      where: { id, deletedAt: null },
      include: {
        author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        responses: {
          include: {
            responder: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        group: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!post) throw new NotFoundException('Mutual aid post not found');
    return post;
  }

  async update(id: string, userId: string, dto: UpdateMutualAidPostDto) {
    const post = await this.prisma.mutualAidPost.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('Mutual aid post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not the author');
    return this.prisma.mutualAidPost.update({
      where: { id },
      data: {
        ...dto,
        urgency: dto.urgency as any,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const post = await this.prisma.mutualAidPost.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('Mutual aid post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not the author');
    return this.prisma.mutualAidPost.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async markFulfilled(id: string, userId: string) {
    const post = await this.prisma.mutualAidPost.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundException('Mutual aid post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not the author');
    return this.prisma.mutualAidPost.update({ where: { id }, data: { status: 'FULFILLED' } });
  }

  async expireStale() {
    const now = new Date();
    await this.prisma.mutualAidPost.updateMany({
      where: { expiresAt: { lte: now }, status: 'OPEN', deletedAt: null },
      data: { status: 'EXPIRED' },
    });
  }
}
