/**
 * Posts Service
 * Business logic for post operations
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto, UpdatePostDto, PostType, PostVisibility } from '../dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new post
   */
  async createPost(userId: string, createPostDto: CreatePostDto) {
    const { content, type, mediaUrl, thumbnailUrl, visibility, hashtags } = createPostDto;

    // Validate content for text posts
    if (type === 'TEXT' && !content) {
      throw new BadRequestException('Text posts must have content');
    }

    // Validate media for image/video posts
    if ((type === 'IMAGE' || type === 'VIDEO') && !mediaUrl) {
      throw new BadRequestException(`${type?.toLowerCase()} posts must have a media URL`);
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        content,
        type: type || 'TEXT',
        mediaUrl,
        thumbnailUrl,
        visibility: visibility || 'PUBLIC',
        hashtags: hashtags || [],
      },
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
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Increment user's post count
    await this.prisma.profile.update({
      where: { userId },
      data: { postCount: { increment: 1 } },
    });

    // Emit event for notifications
    this.eventEmitter.emit('post.created', { post, userId });

    return this.formatPost(post, userId);
  }

  /**
   * Get a single post by ID
   */
  async getPost(postId: string, userId?: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
      },
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
        likes: userId ? {
          where: { userId },
          select: { id: true },
        } : false,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check visibility permissions
    if (post.visibility === 'PRIVATE' && post.authorId !== userId) {
      throw new ForbiddenException('This post is private');
    }

    if (post.visibility === 'FOLLOWERS' && post.authorId !== userId) {
      const isFollowing = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId || '',
            followingId: post.authorId,
          },
        },
      });
      if (!isFollowing) {
        throw new ForbiddenException('This post is only visible to followers');
      }
    }

    // Increment view count
    await this.prisma.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    return this.formatPost(post, userId);
  }

  /**
   * Get paginated feed of posts
   */
  async getFeed(
    params: {
      page: number;
      limit: number;
      type?: PostType;
      authorId?: string;
      hashtag?: string;
    },
    userId?: string,
  ) {
    const { page, limit, type, authorId, hashtag } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      OR: [
        { visibility: 'PUBLIC' },
        ...(userId ? [{ authorId: userId }] : []),
      ],
    };

    if (type) {
      where.type = type;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (hashtag) {
      where.hashtags = { has: hashtag };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          likes: userId ? {
            where: { userId },
            select: { id: true },
          } : false,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts.map((post) => this.formatPost(post, userId)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total,
      },
    };
  }

  /**
   * Get posts from users the current user follows
   */
  async getFollowingFeed(
    userId: string,
    params: { page: number; limit: number },
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    // Get list of users the current user follows
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // Include user's own posts in the feed
    const authorIds = [...followingIds, userId];

    const where: any = {
      authorId: { in: authorIds },
      deletedAt: null,
      OR: [
        { visibility: 'PUBLIC' },
        { visibility: 'FOLLOWERS' },
        { authorId: userId },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          likes: {
            where: { userId },
            select: { id: true },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts.map((post) => this.formatPost(post, userId)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total,
      },
    };
  }

  /**
   * Update a post
   */
  async updatePost(
    postId: string,
    userId: string,
    updatePostDto: UpdatePostDto,
  ) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        content: updatePostDto.content,
        visibility: updatePostDto.visibility,
        hashtags: updatePostDto.hashtags,
      },
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
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return this.formatPost(updated, userId);
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(postId: string, userId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    // Decrement user's post count
    await this.prisma.profile.update({
      where: { userId },
      data: { postCount: { decrement: 1 } },
    });

    this.eventEmitter.emit('post.deleted', { postId, userId });

    return { message: 'Post deleted successfully' };
  }

  /**
   * Search posts by content or hashtags
   */
  async searchPosts(
    query: string,
    params: { page: number; limit: number },
    userId?: string,
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      visibility: 'PUBLIC',
      OR: [
        { content: { contains: query, mode: 'insensitive' } },
        { hashtags: { has: query.toLowerCase().replace('#', '') } },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          likes: userId ? {
            where: { userId },
            select: { id: true },
          } : false,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts.map((post) => this.formatPost(post, userId)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total,
      },
    };
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags(limit: number = 10) {
    const recentPosts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      select: { hashtags: true },
    });

    // Count hashtag occurrences
    const hashtagCounts: Record<string, number> = {};
    for (const post of recentPosts) {
      for (const tag of post.hashtags) {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      }
    }

    // Sort by count and return top N
    const trending = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));

    return trending;
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
      muxPlaybackId: post.muxPlaybackId,
      visibility: post.visibility,
      hashtags: post.hashtags,
      viewCount: post.viewCount,
      likeCount: post._count?.likes ?? post.likeCount,
      commentCount: post._count?.comments ?? post.commentCount,
      shareCount: post.shareCount,
      duration: post.duration,
      isProcessing: post.isProcessing,
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
