// Follow types
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface FollowUser {
  id: string;
  username: string;
  email?: string;
  verified?: boolean;
  profile: UserProfile | null;
  followedAt?: Date;
}

export interface FollowCounts {
  followerCount: number;
  followingCount: number;
}

export interface FollowStatus {
  isFollowing: boolean;
  followedAt: Date | null;
}

export interface MutualConnections {
  mutualFollowing: FollowUser[];
  mutualFollowers: FollowUser[];
  count: {
    following: number;
    followers: number;
  };
}

// User Discovery types
export interface UserProfile {
  userId: string;
  avatarUrl: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  availability: 'available' | 'busy' | null;
  followerCount: number;
  followingCount: number;
}

export interface SearchUser {
  id: string;
  username: string;
  verified: boolean;
  profile: UserProfile | null;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  isFollowing: boolean;
}

export interface RecommendedUser {
  id: string;
  username: string;
  verified: boolean;
  profile: UserProfile | null;
  reason: string;
  stats?: {
    followers: number;
    posts: number;
    recentEngagement?: number;
  };
  mutualCount?: number;
}

export interface TrendingCreator {
  id: string;
  username: string;
  verified: boolean;
  profile: UserProfile | null;
  stats: {
    followers: number;
    posts: number;
    recentEngagement: number;
  };
  trending: {
    timeframe: 'day' | 'week' | 'month';
    engagementScore: number;
  };
}

// Request types
export interface SearchUsersRequest {
  query?: string;
  location?: string;
  skills?: string[];
  availability?: 'available' | 'busy' | 'any';
  verified?: boolean;
  sortBy?: 'relevance' | 'followers' | 'recent' | 'engagement';
  page?: number;
  limit?: number;
}

export interface GetRecommendedUsersRequest {
  limit?: number;
  context?: 'general' | 'similar_interests' | 'mutual_connections' | 'trending';
}

export interface GetTrendingCreatorsRequest {
  timeframe?: 'day' | 'week' | 'month';
  category?: string;
  limit?: number;
}

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FollowersResponse extends PaginatedResponse<FollowUser> {
  followers: FollowUser[];
}

export interface FollowingResponse extends PaginatedResponse<FollowUser> {
  following: FollowUser[];
}

export interface SearchUsersResponse extends PaginatedResponse<SearchUser> {
  users: SearchUser[];
}

export interface RecommendationsResponse {
  recommendations: RecommendedUser[];
  context: string;
}

export interface TrendingCreatorsResponse {
  creators: TrendingCreator[];
  timeframe: 'day' | 'week' | 'month';
  category: string;
}

export interface SuggestedUser {
  id: string;
  username: string;
  profile: {
    avatarUrl: string | null;
    fullName: string | null;
    bio: string | null;
    followerCount: number;
  };
  mutualFollowers: number;
}

export interface BatchFollowStatus {
  userId: string;
  isFollowing: boolean;
  followedAt: Date | null;
}
