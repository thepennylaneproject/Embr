/**
 * Posts Controller
 * REST API endpoints for post operations
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PostsService } from '../services/posts.service';
import { LikesService } from '../services/likes.service';
import { CreatePostDto, UpdatePostDto, PostType } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';


@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly likesService: LikesService,
  ) {}

  /**
   * Create a new post
   * POST /posts
   */
  @Post()
  async createPost(
    @GetUser('id') userId: string,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.createPost(userId, createPostDto);
  }

  /**
   * Get public feed (paginated)
   * GET /posts/feed
   */
  @Get('feed')
  @Public()
  async getFeed(
    @GetUser('id') userId: string | undefined,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') type?: PostType,
    @Query('hashtag') hashtag?: string,
  ) {
    return this.postsService.getFeed(
      {
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 50),
        type,
        hashtag,
      },
      userId,
    );
  }

  /**
   * Get following feed (posts from users you follow)
   * GET /posts/following
   */
  @Get('following')
  async getFollowingFeed(
    @GetUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.postsService.getFollowingFeed(userId, {
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 20, 50),
    });
  }

  /**
   * Search posts
   * GET /posts/search
   */
  @Get('search')
  @Public()
  async searchPosts(
    @GetUser('id') userId: string | undefined,
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.postsService.searchPosts(
      query,
      {
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 50),
      },
      userId,
    );
  }

  /**
   * Get trending hashtags
   * GET /posts/trending/hashtags
   */
  @Get('trending/hashtags')
  @Public()
  async getTrendingHashtags(@Query('limit') limit: string = '10') {
    return this.postsService.getTrendingHashtags(
      Math.min(parseInt(limit, 10) || 10, 50),
    );
  }

  /**
   * Get a single post
   * GET /posts/:id
   */
  @Get(':id')
  @Public()
  async getPost(
    @Param('id', ParseUUIDPipe) postId: string,
    @GetUser('id') userId: string | undefined,
  ) {
    return this.postsService.getPost(postId, userId);
  }

  /**
   * Update a post
   * PATCH /posts/:id
   */
  @Patch(':id')
  async updatePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @GetUser('id') userId: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(postId, userId, updatePostDto);
  }

  /**
   * Delete a post
   * DELETE /posts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @GetUser('id') userId: string,
  ) {
    return this.postsService.deletePost(postId, userId);
  }

  /**
   * Get posts by a specific user
   * GET /posts/user/:userId
   */
  @Get('user/:userId')
  @Public()
  async getUserPosts(
    @Param('userId', ParseUUIDPipe) authorId: string,
    @GetUser('id') currentUserId: string | undefined,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.postsService.getFeed(
      {
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 50),
        authorId,
      },
      currentUserId,
    );
  }

  // ==================
  // LIKES ENDPOINTS
  // ==================

  /**
   * Like a post
   * POST /posts/:id/like
   */
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  async likePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @GetUser('id') userId: string,
  ) {
    return this.likesService.likePost(postId, userId);
  }

  /**
   * Unlike a post
   * DELETE /posts/:id/like
   */
  @Delete(':id/like')
  @HttpCode(HttpStatus.OK)
  async unlikePost(
    @Param('id', ParseUUIDPipe) postId: string,
    @GetUser('id') userId: string,
  ) {
    return this.likesService.unlikePost(postId, userId);
  }

  /**
   * Get users who liked a post
   * GET /posts/:id/likes
   */
  @Get(':id/likes')
  @Public()
  async getPostLikes(
    @Param('id', ParseUUIDPipe) postId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.likesService.getPostLikes(postId, {
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 20, 50),
    });
  }

  /**
   * Get posts liked by a user
   * GET /posts/liked/:userId
   */
  @Get('liked/:userId')
  @Public()
  async getUserLikedPosts(
    @Param('userId', ParseUUIDPipe) userId: string,
    @GetUser('id') currentUserId: string | undefined,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.likesService.getUserLikedPosts(
      userId,
      {
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 50),
      },
      currentUserId,
    );
  }
}
