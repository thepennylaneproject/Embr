import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { NotificationsService } from '../../../core/notifications/notifications.service';
import { CreateMutualAidResponseDto } from '../dto/mutual-aid.dto';

@Injectable()
export class MutualAidResponsesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async respond(postId: string, userId: string, dto: CreateMutualAidResponseDto) {
    const post = await this.prisma.mutualAidPost.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId === userId) throw new ForbiddenException('Cannot respond to your own post');
    if (post.status === 'FULFILLED' || post.status === 'CANCELLED') {
      throw new BadRequestException('This post is no longer active');
    }

    const existing = await this.prisma.mutualAidResponse.findUnique({
      where: { postId_responderId: { postId, responderId: userId } },
    });
    if (existing) throw new ConflictException('You have already responded to this post');

    const [response] = await this.prisma.$transaction([
      this.prisma.mutualAidResponse.create({
        data: { postId, responderId: userId, message: dto.message },
        include: {
          responder: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        },
      }),
      this.prisma.mutualAidPost.update({
        where: { id: postId },
        data: { responseCount: { increment: 1 } },
      }),
    ]);

    await this.notifications.create({
      userId: post.authorId,
      type: 'MUTUAL_AID_RESPONSE',
      title: 'New response to your mutual aid post',
      message: `Someone responded to "${post.title}"`,
      actorId: userId,
      referenceId: postId,
      referenceType: 'mutual_aid_post',
    });

    return response;
  }

  async accept(postId: string, responseId: string, userId: string) {
    const post = await this.prisma.mutualAidPost.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Only the post author can accept responses');

    const response = await this.prisma.mutualAidResponse.findUnique({ where: { id: responseId } });
    if (!response || response.postId !== postId) throw new NotFoundException('Response not found');

    const [updatedResponse] = await this.prisma.$transaction([
      this.prisma.mutualAidResponse.update({
        where: { id: responseId },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.mutualAidPost.update({
        where: { id: postId },
        data: { status: 'IN_PROGRESS' },
      }),
    ]);

    await this.notifications.create({
      userId: response.responderId,
      type: 'MUTUAL_AID_ACCEPTED',
      title: 'Your response was accepted',
      message: `Your response to "${post.title}" was accepted`,
      actorId: userId,
      referenceId: postId,
      referenceType: 'mutual_aid_post',
    });

    return updatedResponse;
  }

  async complete(postId: string, responseId: string, userId: string) {
    const post = await this.prisma.mutualAidPost.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Only the post author can mark as complete');

    await this.prisma.$transaction([
      this.prisma.mutualAidResponse.update({ where: { id: responseId }, data: { status: 'COMPLETED' } }),
      this.prisma.mutualAidPost.update({ where: { id: postId }, data: { status: 'FULFILLED' } }),
    ]);

    return { success: true };
  }

  async decline(postId: string, responseId: string, userId: string) {
    const post = await this.prisma.mutualAidPost.findFirst({ where: { id: postId, deletedAt: null } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Only the post author can decline responses');

    await this.prisma.mutualAidResponse.update({ where: { id: responseId }, data: { status: 'DECLINED' } });
    return { success: true };
  }
}
