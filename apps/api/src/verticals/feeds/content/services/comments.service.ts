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
import { PrismaService } from '../../../../core/database/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentSanitizerService } from '../../../../core/safety/services/content-sanitizer.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sanitizer: ContentSanitizerService,
  ) {}

  async createComment(
    postId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ) {
    const { content, parentId } = createCommentDto;

    // Sanitize content
    const sanitizedContent = this.sanitizer.sanitizeCommentContent(content);

    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // If replying, verify parent comment exists and check nesting depth
    if (parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentId, postId, deletedAt: null },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      // Enforce max nesting depth of 3 levels (main -> reply -> reply)
      const depth = await this.getCommentDepth(parentComment.id, postId);
      const maxDepth = 2; // 0-based, so max 3 levels total
      if (depth >= maxDepth) {
        throw new BadRequestException(
          'Comment nesting limit reached. You can only reply up to 2 levels deep.',
        );
      }
    }

    // Create comment
    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        content: sanitizedContent,
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
      // Removed: deletedAt: null - we want to show deleted comments as tombstones
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
                // Count all replies, including deleted ones for accurate reply count
              },
            },
          },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    // Prefetch all liked comment IDs for the current user in a single query
    let likedIds: Set<string> | undefined;
    if (userId && comments.length > 0) {
      const likes = await this.prisma.like.findMany({
        where: {
          userId,
          commentId: { in: comments.map((c) => c.id) },
        },
        select: { commentId: true },
      });
      likedIds = new Set(likes.map((l) => l.commentId as string));
    }

    const formattedComments = await Promise.all(
      comments.map((comment) => this.formatComment(comment, userId, likedIds)),
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
      where: { id: commentId },
      // Removed: deletedAt: null - allow retrieving deleted comments to show tombstone
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
              // Count all replies including deleted ones
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

    // Sanitize content
    const sanitizedContent = this.sanitizer.sanitizeCommentContent(updateCommentDto.content);

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: sanitizedContent },
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

    // Collect full subtree so soft-delete and count decrement stay consistent.
    const descendantIds = await this.collectDescendantIds(commentId);
    const idsToDelete = [commentId, ...descendantIds];

    // Soft delete this comment and all descendants.
    await this.prisma.comment.updateMany({
      where: {
        id: { in: idsToDelete },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    // Decrement post comment count by total subtree size.
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: idsToDelete.length } },
    });

    // Emit event
    this.eventEmitter.emit('comment.deleted', {
      commentId,
      postId: comment.postId,
      authorId: userId,
      cascadedCount: descendantIds.length,
    });
  }

  private async collectDescendantIds(parentId: string): Promise<string[]> {
    const descendants: string[] = [];
    const queue: string[] = [parentId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) {
        continue;
      }

      const replies = await this.prisma.comment.findMany({
        where: { parentId: currentId, deletedAt: null },
        select: { id: true },
      });

      for (const reply of replies) {
        descendants.push(reply.id);
        queue.push(reply.id);
      }
    }

    return descendants;
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Prevent self-likes
    if (comment.authorId === userId) {
      throw new BadRequestException('You cannot like your own comment');
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

  /**
   * Get the nesting depth of a comment by traversing parent chain
   * Returns the depth: 0 for top-level, 1 for first reply, etc.
   */
  private async getCommentDepth(commentId: string, postId: string): Promise<number> {
    let depth = 0;
    let currentCommentId: string | null = commentId;

    while (currentCommentId) {
      const comment: { parentId: string | null } | null = await this.prisma.comment.findUnique({
        where: { id: currentCommentId },
        select: { parentId: true },
      });

      if (!comment || !comment.parentId) break;

      depth++;
      currentCommentId = comment.parentId;
    }

    return depth;
  }

  private async formatComment(comment: any, userId?: string, likedIds?: Set<string>) {
    // If comment is deleted, return tombstone (preserve thread structure)
    if (comment.deletedAt) {
      return {
        id: comment.id,
        postId: comment.postId,
        authorId: comment.authorId,
        content: '[This comment was removed]',
        isDeleted: true,
        author: null, // Don't expose deleted author info
        parentId: comment.parentId,
        likeCount: 0,
        replyCount: comment._count?.replies || 0,
        isLiked: false,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      };
    }

    let isLiked = false;
    if (userId) {
      if (likedIds !== undefined) {
        // Use pre-fetched set (batch path — no extra query)
        isLiked = likedIds.has(comment.id);
      } else {
        // Single-comment path — fall back to individual query
        isLiked = await this.prisma.like
          .findUnique({
            where: {
              userId_commentId: {
                userId,
                commentId: comment.id,
              },
            },
          })
          .then(Boolean);
      }
    }

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
      isDeleted: false,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }
}
