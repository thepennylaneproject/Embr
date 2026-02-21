import { apiClient } from './base';
import type {
  FollowUser,
  FollowCounts,
  FollowStatus,
  MutualConnections,
  SearchUser,
  RecommendedUser,
  TrendingCreator,
  SearchUsersRequest,
  GetRecommendedUsersRequest,
  GetTrendingCreatorsRequest,
  FollowersResponse,
  FollowingResponse,
  SearchUsersResponse,
  RecommendationsResponse,
  TrendingCreatorsResponse,
  SuggestedUser,
  BatchFollowStatus,
} from '../types/social.types';

export const socialApi = {
  // Follow operations
  followUser: async (userId: string): Promise<FollowUser> => {
    const { data } = await apiClient.post('/follows', { followingId: userId });
    return data;
  },

  unfollowUser: async (userId: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/follows/${userId}`);
    return data;
  },

  getFollowers: async (
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<FollowersResponse> => {
    const { data } = await apiClient.get(`/follows/followers/${userId}`, {
      params: { page, limit },
    });
    return data;
  },

  getFollowing: async (
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<FollowingResponse> => {
    const { data } = await apiClient.get(`/follows/following/${userId}`, {
      params: { page, limit },
    });
    return data;
  },

  checkFollowStatus: async (
    userId: string, 
    targetUserId: string
  ): Promise<FollowStatus> => {
    const { data } = await apiClient.get('/follows/check', {
      params: { userId, targetUserId },
    });
    return data;
  },

  batchCheckFollowStatus: async (userIds: string[]): Promise<BatchFollowStatus[]> => {
    const { data } = await apiClient.post('/follows/batch-check', { userIds });
    return data;
  },

  getMutualConnections: async (
    userId: string, 
    limit: number = 10
  ): Promise<MutualConnections> => {
    const { data } = await apiClient.get('/follows/mutual', {
      params: { userId, limit },
    });
    return data;
  },

  getFollowCounts: async (userId: string): Promise<FollowCounts> => {
    const { data } = await apiClient.get(`/follows/counts/${userId}`);
    return data;
  },

  getSuggestedFromNetwork: async (limit: number = 10): Promise<SuggestedUser[]> => {
    const { data } = await apiClient.get('/follows/suggestions', {
      params: { limit },
    });
    return data;
  },

  // Discovery operations
  searchUsers: async (params: SearchUsersRequest): Promise<SearchUsersResponse> => {
    const { data } = await apiClient.get('/discovery/search', { params });
    return data;
  },

  getRecommendedUsers: async (
    params: GetRecommendedUsersRequest = {}
  ): Promise<RecommendationsResponse> => {
    const { data } = await apiClient.get('/discovery/recommended', { params });
    return data;
  },

  getTrendingCreators: async (
    params: GetTrendingCreatorsRequest = {}
  ): Promise<TrendingCreatorsResponse> => {
    const { data } = await apiClient.get('/discovery/trending', { params });
    return data;
  },

  getSimilarUsers: async (limit: number = 10): Promise<RecommendedUser[]> => {
    const { data } = await apiClient.get('/discovery/similar', {
      params: { limit },
    });
    return data;
  },
};

// Export individual functions for tree-shaking
export const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowStatus,
  batchCheckFollowStatus,
  getMutualConnections,
  getFollowCounts,
  getSuggestedFromNetwork,
  searchUsers,
  getRecommendedUsers,
  getTrendingCreators,
  getSimilarUsers,
} = socialApi;
