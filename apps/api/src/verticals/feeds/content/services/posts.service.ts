/**
 * Posts Service
 * Business logic for post operations
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  TooManyRequestsException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { CreatePostDto, UpdatePostDto, PostType, PostVisibility } from '../dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContentSanitizerService } from '../../../core/safety/services/content-sanitizer.service';
import { RateLimitService } from '../../../core/rate-limit/rate-limit.service';
import { CursorPaginationService } from '../../../core/pagination/cursor-pagination.service';
import { CacheService } from '../../../core/cache/cache.service';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sanitizer: ContentSanitizerService,
    private readonly rateLimit: RateLimitService,
    private readonly pagination: CursorPaginationService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Create a new post
   */
  async createPost(userId: string, createPostDto: CreatePostDto) {
    const { content, type, mediaUrl, thumbnailUrl, visibility, hashtags } = createPostDto;

    // Rate limiting: max 10 posts per hour per user
    const maxPostsPerHour = 10;
    const oneHourMs = 60 * 60 * 1000;

    if (!this.rateLimit.isAllowed(userId, 'post:create', maxPostsPerHour, oneHourMs)) {
      const resetTimeMs = this.rateLimit.getResetTime(userId, 'post:create');
      const resetTimeSec = Math.ceil(resetTimeMs / 1000);
      throw new TooManyRequestsException(
        `Too many posts. Please try again in ${resetTimeSec} seconds.`,
      );
    }

    // Sanitize content
    const sanitizedContent = this.sanitizer.sanitizePostContent(content);
    const sanitizedHashtags = this.sanitizer.sanitizeHashtags(hashtags);

    // Validate content for text posts
    if (type === 'TEXT' && !sanitizedContent) {
      throw new BadRequestException('Text posts must have content');
    }

    // Validate media for image/video posts
    if ((type === 'IMAGE' || type === 'VIDEO') && !mediaUrl) {
      throw new BadRequestException(`${type?.toLowerCase()} posts must have a media URL`);
    }

    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        content: sanitizedContent,
        type: type || 'TEXT',
        mediaUrl,
        thumbnailUrl,
        visibility: visibility || 'PUBLIC',
        hashtags: sanitizedHashtags,
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
      // Filter out posts from blocked users
      AND: [
        {
          author: {
            // Exclude users that have blocked the current user
            blockedBy: { none: { blockerId: userId || 'null' } },
          },
        },
        {
          author: {
            // Exclude users that the current user has blocked
            blocking: { none: { blockedId: userId || 'null' } },
          },
        },
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
   * Get feed with cursor-based pagination (recommended)
   * More efficient for large datasets and real-time feeds
   * Includes caching for performance optimization
   */
  async getFeedCursor(
    params: {
      cursor?: string;
      limit: number;
      type?: PostType;
      authorId?: string;
      hashtag?: string;
    },
    userId?: string,
  ) {
    const { cursor, limit, type, authorId, hashtag } = params;

    // Generate cache key based on parameters
    const cacheKey = `feed:cursor:${userId || 'anon'}:${cursor || 'start'}:${limit}:${type || 'all'}:${authorId || 'all'}:${hashtag || 'all'}`;

    // Try to get from cache first (only for initial page, not when cursor is used)
    if (!cursor) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const where: any = {
      deletedAt: null,
      OR: [
        { visibility: 'PUBLIC' },
        ...(userId ? [{ authorId: userId }] : []),
      ],
      // Filter out posts from blocked users
      AND: [
        {
          author: {
            blockedBy: { none: { blockerId: userId || 'null' } },
          },
        },
        {
          author: {
            blocking: { none: { blockedId: userId || 'null' } },
          },
        },
      ],
      // Apply cursor filter if provided
      ...this.pagination.getCursorWhereClause(cursor, 'forward'),
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

    // Fetch limit+1 to determine if there are more results
    const posts = await this.prisma.post.findMany({
      where,
      take: limit + 1,
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
        likes: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const hasMore = posts.length > limit;
    const data = posts.slice(0, limit);

    const result = {
      data: data.map((post) => this.formatPost(post, userId)),
      ...this.pagination.buildResponse(data, limit, hasMore),
    };

    // Cache the first page result (5 minutes TTL)
    if (!cursor) {
      await this.cache.set(cacheKey, result, { ttl: 300 });
    }

    return result;
  }

  /**
   * Invalidate feed cache when content changes
   */
  private async invalidateFeedCache(userId?: string): Promise<void> {
    // Invalidate all feed caches for the user or all users if not specified
    const pattern = userId ? `feed:*${userId}*` : 'feed:*';
    // Note: In-memory cache doesn't support pattern deletion
    // For Redis, you would use KEYS pattern matching
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
      // Filter out posts from blocked users
      AND: [
        {
          author: {
            // Exclude users that have blocked the current user
            blockedBy: { none: { blockerId: userId } },
          },
        },
        {
          author: {
            // Exclude users that the current user has blocked
            blocking: { none: { blockedId: userId } },
          },
        },
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

    // Sanitize content and hashtags
    const sanitizedContent = this.sanitizer.sanitizePostContent(updatePostDto.content);
    const sanitizedHashtags = this.sanitizer.sanitizeHashtags(updatePostDto.hashtags);

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        content: sanitizedContent,
        visibility: updatePostDto.visibility,
        hashtags: sanitizedHashtags,
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
   * Search posts by content or hashtags (optimized with indexing and caching)
   */
  async searchPosts(
    query: string,
    params: { page: number; limit: number },
    userId?: string,
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const normalizedQuery = query.toLowerCase().trim();
    const hashtag = normalizedQuery.replace(/^#+/, '');

    // Try cache for first page (popular searches)
    if (page === 1) {
      const cacheKey = `search:posts:${normalizedQuery}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const where: any = {
      deletedAt: null,
      visibility: 'PUBLIC',
      AND: [
        {
          author: {
            blockedBy: { none: { blockerId: userId || 'null' } },
          },
        },
        {
          author: {
            blocking: { none: { blockedId: userId || 'null' } },
          },
        },
      ],
      // Multi-field search with different strategies
      OR: [
        // Exact hashtag match (indexed field)
        { hashtags: { has: hashtag } },
        // Content search
        { content: { contains: normalizedQuery, mode: 'insensitive' } },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        // Order by relevance and recency
        orderBy: [
          // Hashtag matches are more relevant, followed by recent posts
          { createdAt: 'desc' },
        ],
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
          likes: userId
            ? {
                where: { userId },
                select: { id: true },
              }
            : false,
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

    const result = {
      data: posts.map((post) => this.formatPost(post, userId)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + posts.length < total,
      },
    };

    // Cache first page for popular searches (10 minutes TTL)
    if (page === 1) {
      const cacheKey = `search:posts:${normalizedQuery}`;
      await this.cache.set(cacheKey, result, { ttl: 600 });
    }

    return result;
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
