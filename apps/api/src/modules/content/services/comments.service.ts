/**
 * Comments Service
 * Business logic for comment operations
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createComment(
    postId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ) {
    const { content, parentId } = createCommentDto;

    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // If replying, verify parent comment exists
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId, postId, deletedAt: null },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        content,
        parentId,
      },
      include: {
        author: {
          include: {
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

    // Increment post comment count
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    // Emit event for notifications
    this.eventEmitter.emit('comment.created', {
      commentId: comment.id,
      postId,
      authorId: userId,
      postAuthorId: post.authorId,
      parentId,
    });

    return this.formatComment(comment, userId);
  }

  async getComments(
    postId: string,
    params: { page: number; limit: number; parentId?: string },
    userId?: string,
  ) {
    const { page = 1, limit = 20, parentId } = params;
    const skip = (page - 1) * limit;

    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const where = {
      postId,
      parentId: parentId || null,
      deletedAt: null,
    };

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            include: {
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          _count: {
            select: {
              replies: {
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    const formattedComments = await Promise.all(
      comments.map((comment) => this.formatComment(comment, userId)),
    );

    return {
      data: formattedComments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + comments.length < total,
      },
    };
  }

  async getReplies(
    postId: string,
    commentId: string,
    params: { page: number; limit: number },
    userId?: string,
  ) {
    // Verify parent comment exists
    const parentComment = await this.prisma.comment.findUnique({
      where: { id: commentId, postId, deletedAt: null },
    });

    if (!parentComment) {
      throw new NotFoundException('Parent comment not found');
    }

    return this.getComments(postId, { ...params, parentId: commentId }, userId);
  }

  async getComment(commentId: string, userId?: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
      include: {
        author: {
          include: {
            profile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.formatComment(comment, userId);
  }

  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('Not authorized to update this comment');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: updateCommentDto.content },
      include: {
        author: {
          include: {
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

    return this.formatComment(updatedComment, userId);
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('Not authorized to delete this comment');
    }

    // Soft delete
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    // Decrement post comment count
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });

    // Emit event
    this.eventEmitter.emit('comment.deleted', {
      commentId,
      postId: comment.postId,
      authorId: userId,
    });
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if already liked
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException('Comment already liked');
    }

    // Create like
    await this.prisma.like.create({
      data: {
        userId,
        commentId,
      },
    });

    // Increment like count
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    });

    // Emit event
    this.eventEmitter.emit('comment.liked', {
      commentId,
      userId,
      authorId: comment.authorId,
    });

    return { message: 'Comment liked successfully' };
  }

  async unlikeComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Find and delete like
    const like = await this.prisma.like.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (!like) {
      throw new BadRequestException('Comment not liked');
    }

    await this.prisma.like.delete({
      where: { id: like.id },
    });

    // Decrement like count
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
    });

    return { message: 'Comment unliked successfully' };
  }

  private async formatComment(comment: any, userId?: string) {
    const isLiked = userId
      ? await this.prisma.like.findUnique({
          where: {
            userId_commentId: {
              userId,
              commentId: comment.id,
            },
          },
        }).then(Boolean)
      : false;

    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        profile: {
          displayName: comment.author.profile.displayName,
          avatarUrl: comment.author.profile.avatarUrl,
        },
      },
      content: comment.content,
      parentId: comment.parentId,
      likeCount: comment.likeCount,
      replyCount: comment._count?.replies || 0,
      isLiked,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }
}
