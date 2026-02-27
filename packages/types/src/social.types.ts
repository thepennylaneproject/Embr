/**
 * Social Graph Types
 * Unified type definitions for follows, discovery, recommendations, and trending
 */

// ============================================================================
// FOLLOW TYPES
// ============================================================================

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface FollowUser {
  id: string;
  followerId?: string;
  followingId?: string;
  username: string;
  displayName?: string;
  email?: string;
  verified?: boolean;
  profile: UserProfile | null;
  followedAt?: Date;
  createdAt?: Date;
  user?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
    verified?: boolean;
  };
}

export interface FollowCounts {
  followerCount: number;
  followingCount: number;
}

export interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy?: boolean;
  isMutual?: boolean;
  followedAt?: Date | null;
}

export interface MutualConnections {
  mutualFollowing: {
    id: string;
    username: string;
    displayName?: string;
    profile?: {
      avatarUrl?: string;
    };
  }[];
  mutualFollowers: {
    id: string;
    username: string;
    displayName?: string;
    profile?: {
      avatarUrl?: string;
    };
  }[];
  count: {
    following: number;
    followers: number;
  };
}

// ============================================================================
// USER DISCOVERY TYPES
// ============================================================================

export interface UserProfile {
  userId?: string;
  id?: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  displayName?: string | null;
  bio?: string | null;
  location?: string | null;
  skills?: string[];
  availability?: 'available' | 'busy' | null;
  followerCount?: number;
  followingCount?: number;
  isVerified?: boolean;
}

export interface SearchUser {
  id: string;
  username: string;
  displayName?: string;
  verified?: boolean;
  isVerified?: boolean;
  profile?: UserProfile | null;
  stats?: {
    posts?: number;
    followers?: number;
    following?: number;
  };
  isFollowing?: boolean;
  matchScore?: number;
}

export interface RecommendedUser {
  id: string;
  username: string;
  displayName?: string;
  verified?: boolean;
  isVerified?: boolean;
  profile?: UserProfile | null;
  stats?: {
    followers?: number;
    posts?: number;
    recentEngagement?: number;
  };
  reason?: string;
  recommendationReason?: string;
  mutualFollowersCount?: number;
  mutualCount?: number;
  score?: number;
}

export interface TrendingCreator {
  id: string;
  username: string;
  displayName?: string;
  verified?: boolean;
  isVerified?: boolean;
  profile?: UserProfile | null;
  stats?: {
    followers?: number;
    posts?: number;
    recentEngagement?: number;
  };
  trending?: {
    timeframe?: 'day' | 'week' | 'month';
    engagementScore?: number;
  };
  growthRate?: number;
  engagementScore?: number;
  recentContent?: {
    id: string;
    title: string;
    thumbnail?: string;
  }[];
  category?: string;
  rank?: number;
}

export interface SuggestedUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  verified?: boolean;
  profile?: {
    avatarUrl?: string | null;
    fullName?: string | null;
    bio?: string | null;
    followerCount?: number;
  };
  mutualFollowersCount?: number;
  mutualFollowers?: number;
  mutualFollowers?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  }[];
  suggestionReason?: string;
}

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface SearchUsersRequest {
  query?: string;
  location?: string;
  skills?: string[];
  availability?: 'available' | 'busy' | 'any';
  verified?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
  sortBy?: 'relevance' | 'followers' | 'recent' | 'engagement';
  page?: number;
  limit?: number;
  category?: string;
}

export interface GetRecommendedUsersRequest {
  limit?: number;
  context?: 'general' | 'similar_interests' | 'mutual_connections' | 'trending';
  excludeIds?: string[];
}

export interface GetTrendingCreatorsRequest {
  timeframe?: 'day' | 'week' | 'month';
  category?: string;
  limit?: number;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface FollowersResponse {
  followers: FollowUser[];
  pagination: Pagination;
}

export interface FollowingResponse {
  following: FollowUser[];
  pagination: Pagination;
}

export interface SearchUsersResponse {
  users: SearchUser[];
  pagination: Pagination;
}

export interface RecommendationsResponse {
  recommendations: RecommendedUser[];
  context: string;
}

export interface TrendingCreatorsResponse {
  creators: TrendingCreator[];
  timeframe?: 'day' | 'week' | 'month';
  category?: string;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

export interface BatchFollowStatus {
  userId: string;
  isFollowing: boolean;
  isFollowedBy?: boolean;
  followedAt?: Date | null;
}
