/**
 * Shared TypeScript types for content management
 * Used across backend, frontend web, and mobile apps
 */

// ============================================
// POST TYPES
// ============================================

export enum PostType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum PostVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE = 'private',
}

export interface Post {
  id: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    profile: {
      displayName: string;
      avatarUrl?: string;
      bio?: string;
    };
  };
  type: PostType;
  content?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  visibility: PostVisibility;
  hashtags: string[];
  mentions: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  duration?: number; // Video duration in seconds
  isProcessing: boolean;
  createdAt: string;
  updatedAt: string;
  
  // User-specific fields (returned when authenticated)
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface CreatePostInput {
  type: PostType;
  content?: string;
  visibility?: PostVisibility;
  hashtags?: string[];
  mentions?: string[];
}

export interface UpdatePostInput {
  content?: string;
  visibility?: PostVisibility;
  hashtags?: string[];
  mentions?: string[];
}

// ============================================
// COMMENT TYPES
// ============================================

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    profile: {
      displayName: string;
      avatarUrl?: string;
    };
  };
  content: string;
  parentId?: string;
  likeCount: number;
  replyCount?: number;
  createdAt: string;
  updatedAt: string;
  
  // User-specific fields
  isLiked?: boolean;
  
  // For nested comments
  replies?: Comment[];
}

export interface CreateCommentInput {
  content: string;
  parentId?: string;
}

export interface UpdateCommentInput {
  content: string;
}

// ============================================
// ENGAGEMENT TYPES
// ============================================

export interface Like {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  createdAt: string;
}

export interface Share {
  id: string;
  userId: string;
  postId: string;
  platform?: string;
  createdAt: string;
}

// ============================================
// FEED TYPES
// ============================================

export enum FeedType {
  FOR_YOU = 'for-you',
  FOLLOWING = 'following',
  TRENDING = 'trending',
}

export interface FeedParams {
  page?: number;
  limit?: number;
  cursor?: string;
  feedType?: FeedType;
}

export interface FeedResponse {
  data: Post[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

// ============================================
// UPLOAD TYPES
// ============================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  fields?: Record<string, string>;
}

export interface MediaUploadResponse {
  mediaUrl: string;
  thumbnailUrl?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  duration?: number;
}

// ============================================
// PAGINATION & FILTERS
// ============================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

// ============================================
// ERROR TYPES
// ============================================

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: any;
}
