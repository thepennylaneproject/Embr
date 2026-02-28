import { useState, useCallback, useEffect, useRef } from 'react';
import { socialApi } from '@shared/api/social.api';
import type {
  SearchUser,
  RecommendedUser,
  TrendingCreator,
  SearchUsersRequest,
  GetRecommendedUsersRequest,
  GetTrendingCreatorsRequest
} from '@shared/types/social.types';

/**
 * Debounce helper to delay function execution
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export const useUserSearch = () => {
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [lastQuery, setLastQuery] = useState<SearchUsersRequest>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (
    params: SearchUsersRequest,
    currentPage: number,
    resetPage: boolean
  ) => {
    const searchParams = { ...params, page: currentPage, limit: 20 };

    setLoading(true);
    setError(null);
    if (resetPage) {
      setLastQuery(params);
    }

    try {
      const response = await socialApi.searchUsers(searchParams);

      if (resetPage) {
        setUsers(response.users);
        setPage(2);
      } else {
        setUsers(prev => [...prev, ...response.users]);
        setPage(prev => prev + 1);
      }

      setHasMore(currentPage < response.pagination.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search users');
    } finally {
      setLoading(false);
    }
  }, []);

  const searchUsers = useCallback((
    params: SearchUsersRequest,
    resetPage: boolean = false
  ) => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer (300ms delay to avoid excessive API calls)
    debounceTimerRef.current = setTimeout(() => {
      const currentPage = resetPage ? 1 : page;
      performSearch(params, currentPage, resetPage);
    }, 300);
  }, [page, performSearch]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      // loadMore should not be debounced (explicit user action)
      const currentPage = page;
      performSearch(lastQuery, currentPage, false);
    }
  }, [hasMore, loading, lastQuery, page, performSearch]);

  const reset = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setUsers([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    setLastQuery({});
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    users,
    loading,
    error,
    hasMore,
    searchUsers,
    loadMore,
    reset,
  };
};

export const useRecommendedUsers = (autoLoad: boolean = false) => {
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<string>('general');

  const loadRecommendations = useCallback(async (
    params: GetRecommendedUsersRequest = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await socialApi.getRecommendedUsers(params);
      setRecommendations(response.recommendations);
      setContext(response.context);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadRecommendations();
    }
  }, [autoLoad, loadRecommendations]);

  const refresh = useCallback(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  return {
    recommendations,
    loading,
    error,
    context,
    loadRecommendations,
    refresh,
  };
};

export const useTrendingCreators = (
  defaultTimeframe: 'day' | 'week' | 'month' = 'week',
  autoLoad: boolean = false
) => {
  const [creators, setCreators] = useState<TrendingCreator[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>(defaultTimeframe);
  const [category, setCategory] = useState<string>('all');

  const loadTrendingCreators = useCallback(async (
    params: GetTrendingCreatorsRequest = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await socialApi.getTrendingCreators(params);
      setCreators(response.creators);
      setTimeframe(response.timeframe);
      setCategory(response.category);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load trending creators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadTrendingCreators({ timeframe: defaultTimeframe });
    }
  }, [autoLoad, defaultTimeframe, loadTrendingCreators]);

  const changeTimeframe = useCallback((newTimeframe: 'day' | 'week' | 'month') => {
    setTimeframe(newTimeframe);
    loadTrendingCreators({ timeframe: newTimeframe, category: category !== 'all' ? category : undefined });
  }, [category, loadTrendingCreators]);

  const changeCategory = useCallback((newCategory: string) => {
    setCategory(newCategory);
    loadTrendingCreators({ 
      timeframe, 
      category: newCategory !== 'all' ? newCategory : undefined 
    });
  }, [timeframe, loadTrendingCreators]);

  const refresh = useCallback(() => {
    loadTrendingCreators({ timeframe, category: category !== 'all' ? category : undefined });
  }, [timeframe, category, loadTrendingCreators]);

  return {
    creators,
    loading,
    error,
    timeframe,
    category,
    loadTrendingCreators,
    changeTimeframe,
    changeCategory,
    refresh,
  };
};

export const useSimilarUsers = (autoLoad: boolean = false) => {
  const [similarUsers, setSimilarUsers] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadSimilarUsers = useCallback(async (limit: number = 10) => {
    setLoading(true);
    setError(null);

    try {
      const users = await socialApi.getSimilarUsers(limit);
      setSimilarUsers(users);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load similar users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadSimilarUsers();
    }
  }, [autoLoad, loadSimilarUsers]);

  return {
    similarUsers,
    loading,
    error,
    loadSimilarUsers,
    refresh: () => loadSimilarUsers(),
  };
};

// Utility hook for batch checking follow status
export const useBatchFollowCheck = () => {
  const [followStatusMap, setFollowStatusMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);

  const checkMultipleUsers = useCallback(async (userIds: string[]) => {
    setLoading(true);
    try {
      const statuses = await socialApi.batchCheckFollowStatus(userIds);
      const statusMap = new Map(
        statuses.map(s => [s.userId, s.isFollowing])
      );
      setFollowStatusMap(statusMap);
      return statusMap;
    } catch (err) {
      console.error('Failed to batch check follow status:', err);
      return new Map();
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    followStatusMap,
    loading,
    checkMultipleUsers,
    isFollowing: (userId: string) => followStatusMap.get(userId) || false,
  };
};
