import { useState, useCallback } from 'react';
import { socialApi } from '@shared/api/social.api';
import type { FollowUser, FollowCounts, FollowStatus, MutualConnections } from '@shared/types/social.types';

export const useFollow = (userId?: string) => {
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  // Follow a user (optimistic update with rollback on failure)
  const follow = useCallback(async (targetUserId: string) => {
    // Save previous state for rollback
    const previousIsFollowing = isFollowing;
    const previousFollowerCount = followerCount;

    // Optimistic update
    setLoading(true);
    setError(null);
    setIsFollowing(true);
    setFollowerCount(prev => prev + 1);

    try {
      await socialApi.followUser(targetUserId);
      return true;
    } catch (err: any) {
      // Rollback on failure
      setIsFollowing(previousIsFollowing);
      setFollowerCount(previousFollowerCount);

      const errorMsg = err.response?.data?.message || 'Failed to follow user';
      setError(errorMsg);
      console.error('Follow error:', errorMsg, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isFollowing, followerCount]);

  // Unfollow a user (optimistic update with rollback on failure)
  const unfollow = useCallback(async (targetUserId: string) => {
    // Save previous state for rollback
    const previousIsFollowing = isFollowing;
    const previousFollowerCount = followerCount;

    // Optimistic update
    setLoading(true);
    setError(null);
    setIsFollowing(false);
    setFollowerCount(prev => Math.max(0, prev - 1));

    try {
      await socialApi.unfollowUser(targetUserId);
      return true;
    } catch (err: any) {
      // Rollback on failure
      setIsFollowing(previousIsFollowing);
      setFollowerCount(previousFollowerCount);

      const errorMsg = err.response?.data?.message || 'Failed to unfollow user';
      setError(errorMsg);
      console.error('Unfollow error:', errorMsg, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isFollowing, followerCount]);

  // Toggle follow status
  const toggleFollow = useCallback(async (targetUserId: string) => {
    if (isFollowing) {
      return await unfollow(targetUserId);
    } else {
      return await follow(targetUserId);
    }
  }, [isFollowing, follow, unfollow]);

  // Check follow status
  const checkFollowStatus = useCallback(async (currentUserId: string, targetUserId: string) => {
    try {
      const status = await socialApi.checkFollowStatus(currentUserId, targetUserId);
      setIsFollowing(status.isFollowing);
      return status;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check follow status');
      return null;
    }
  }, []);

  // Get follow counts
  const getFollowCounts = useCallback(async (targetUserId: string) => {
    try {
      const counts = await socialApi.getFollowCounts(targetUserId);
      setFollowerCount(counts.followerCount);
      setFollowingCount(counts.followingCount);
      return counts;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to get follow counts');
      return null;
    }
  }, []);

  return {
    isFollowing,
    loading,
    error,
    followerCount,
    followingCount,
    follow,
    unfollow,
    toggleFollow,
    checkFollowStatus,
    getFollowCounts,
    setIsFollowing,
    setFollowerCount,
    setFollowingCount,
  };
};

export const useFollowers = (userId: string) => {
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  const loadFollowers = useCallback(async (resetPage: boolean = false) => {
    if (loading) return;
    
    const currentPage = resetPage ? 1 : page;
    setLoading(true);
    setError(null);
    
    try {
      const response = await socialApi.getFollowers(userId, currentPage, 20);
      
      if (resetPage) {
        setFollowers(response.followers);
        setPage(2);
      } else {
        setFollowers(prev => [...prev, ...response.followers]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(currentPage < response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  }, [userId, page, loading]);

  return {
    followers,
    loading,
    error,
    hasMore,
    loadFollowers,
    refresh: () => loadFollowers(true),
  };
};

export const useFollowing = (userId: string) => {
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  const loadFollowing = useCallback(async (resetPage: boolean = false) => {
    if (loading) return;
    
    const currentPage = resetPage ? 1 : page;
    setLoading(true);
    setError(null);
    
    try {
      const response = await socialApi.getFollowing(userId, currentPage, 20);
      
      if (resetPage) {
        setFollowing(response.following);
        setPage(2);
      } else {
        setFollowing(prev => [...prev, ...response.following]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(currentPage < response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load following');
    } finally {
      setLoading(false);
    }
  }, [userId, page, loading]);

  return {
    following,
    loading,
    error,
    hasMore,
    loadFollowing,
    refresh: () => loadFollowing(true),
  };
};

export const useMutualConnections = (userId: string) => {
  const [mutualConnections, setMutualConnections] = useState<MutualConnections | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadMutualConnections = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await socialApi.getMutualConnections(userId, limit);
      setMutualConnections(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load mutual connections');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    mutualConnections,
    loading,
    error,
    loadMutualConnections,
  };
};
