/**
 * Social Types - Re-exports from shared types package
 *
 * This file re-exports types from the @shared/types package to maintain
 * backward compatibility with frontend imports.
 *
 * Source of truth: packages/types/src/social.types.ts
 */

export type {
  Follow,
  FollowUser,
  FollowCounts,
  FollowStatus,
  MutualConnections,
  UserProfile,
  SearchUser,
  RecommendedUser,
  TrendingCreator,
  SuggestedUser,
  SearchUsersRequest,
  GetRecommendedUsersRequest,
  GetTrendingCreatorsRequest,
  Pagination,
  PaginatedResponse,
  FollowersResponse,
  FollowingResponse,
  SearchUsersResponse,
  RecommendationsResponse,
  TrendingCreatorsResponse,
  BatchFollowStatus,
} from '@embr/types';
