/**
 * Likes Service
 * Business logic for like/unlike operations on posts
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Like a post
   */
  async likePost(postId: string, userId: string) {
    // Check if post exists
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if already liked
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingLike) {
      throw new ConflictException('You have already liked this post');
    }

    // Create like and increment count atomically
    const [like] = await this.prisma.$transaction([
      this.prisma.like.create({
        data: { userId, postId },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    // Emit notification event (don't notify self)
    if (post.authorId !== userId) {
      this.eventEmitter.emit('post.liked', {
        postId,
        postAuthorId: post.authorId,
        likerId: userId,
      });
    }

    return {
      message: 'Post liked successfully',
      liked: true,
      likeId: like.id,
    };
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, userId: string) {
    // Check if post exists
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if like exists
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (!existingLike) {
      throw new NotFoundException('You have not liked this post');
    }

    // Delete like and decrement count atomically
    await this.prisma.$transaction([
      this.prisma.like.delete({
        where: { id: existingLike.id },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    return {
      message: 'Post unliked successfully',
      liked: false,
    };
  }

  /**
   * Check if user has liked a post
   */
  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });
    return !!like;
  }

  /**
   * Get users who liked a post (paginated)
   */
  async getPostLikes(
    postId: string,
    params: { page: number; limit: number },
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Check if post exists
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where: { postId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                  isVerified: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.like.count({ where: { postId } }),
    ]);

    return {
      data: likes.map((like) => ({
        id: like.id,
        createdAt: like.createdAt,
        user: {
          id: like.user.id,
          username: like.user.username,
          displayName: like.user.profile?.displayName,
          avatarUrl: like.user.profile?.avatarUrl,
          isVerified: like.user.profile?.isVerified,
        },
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + likes.length < total,
      },
    };
  }

  /**
   * Get posts liked by a user (paginated)
   */
  async getUserLikedPosts(
    userId: string,
    params: { page: number; limit: number },
    currentUserId?: string,
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where: {
          userId,
          post: {
            deletedAt: null,
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: {
                      displayName: true,
                      avatarUrl: true,
                      isVerified: true,
                    },
                  },
                },
              },
              likes: currentUserId ? {
                where: { userId: currentUserId },
                select: { id: true },
              } : false,
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.like.count({
        where: {
          userId,
          post: { deletedAt: null },
        },
      }),
    ]);

    return {
      data: likes.map((like) => this.formatPost(like.post, currentUserId)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + likes.length < total,
      },
    };
  }

  /**
   * Format post for API response
   */
  private formatPost(post: any, userId?: string) {
    const isLiked = Array.isArray(post.likes) && post.likes.length > 0;
    const isOwner = post.authorId === userId;

    return {
      id: post.id,
      content: post.content,
      type: post.type,
      mediaUrl: post.mediaUrl,
      thumbnailUrl: post.thumbnailUrl,
      visibility: post.visibility,
      hashtags: post.hashtags,
      viewCount: post.viewCount,
      likeCount: post._count?.likes ?? post.likeCount,
      commentCount: post._count?.comments ?? post.commentCount,
      shareCount: post.shareCount,
      isLiked,
      isOwner,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author ? {
        id: post.author.id,
        username: post.author.username,
        displayName: post.author.profile?.displayName,
        avatarUrl: post.author.profile?.avatarUrl,
        isVerified: post.author.profile?.isVerified,
      } : null,
    };
  }
}
