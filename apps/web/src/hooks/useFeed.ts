/**
 * useFeed Hook
 * Manages feed loading with infinite scroll and optimistic updates
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { contentApi } from '@shared/api/content.api';
import { Post, FeedType, FeedResponse } from '@shared/types/content.types';

interface UseFeedParams {
  feedType?: FeedType;
  limit?: number;
  autoLoad?: boolean;
}

interface UseFeedReturn {
  // State
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Actions
  loadFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  optimisticUpdatePost: (postId: string, updates: Partial<Post>) => void;
  removePost: (postId: string) => void;
  prependPost: (post: Post) => void;

  // Engagement with optimistic updates
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  incrementCommentCount: (postId: string) => void;
  incrementShareCount: (postId: string) => void;
}

export const useFeed = (params?: UseFeedParams): UseFeedReturn => {
  const {
    feedType = FeedType.FOR_YOU,
    limit = 20,
    autoLoad = true,
  } = params || {};

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  const loadFeed = useCallback(async () => {
    if (isLoadingRef.current || isLoadingMoreRef.current) return;

    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      const response: FeedResponse = await contentApi.getFeed({
        feedType,
        page: 1,
        limit,
        signal: abortControllerRef.current.signal,
      });

      if (isMountedRef.current) {
        setPosts(response.data);
        setHasMore(response.meta.hasMore);
        setPage(1);
      }
    } catch (err: any) {
      if (axios.isCancel(err)) return;

      const errorMessage = err.response?.data?.message || 'Failed to load feed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [feedType, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      setError(null);

      const nextPage = page + 1;
      const response: FeedResponse = await contentApi.getFeed({
        feedType,
        page: nextPage,
        limit,
      });

      if (isMountedRef.current) {
        setPosts((prev) => [...prev, ...response.data]);
        setHasMore(response.meta.hasMore);
        setPage(nextPage);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load more posts';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [hasMore, isLoading, isLoadingMore, page, feedType, limit]);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      setError(null);

      const response: FeedResponse = await contentApi.getFeed({
        feedType,
        page: 1,
        limit,
      });

      if (isMountedRef.current) {
        setPosts(response.data);
        setHasMore(response.meta.hasMore);
        setPage(1);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to refresh feed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing, feedType, limit]);

  // Optimistic update helper
  const optimisticUpdatePost = useCallback((postId: string, updates: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, ...updates } : post))
    );
  }, []);

  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }, []);

  const prependPost = useCallback((post: Post) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  // Engagement actions with optimistic updates
  // Using functional setState form so these callbacks never close over `posts`,
  // giving them stable identity and preventing PostCard rerenders.
  const likePost = useCallback(
    async (postId: string) => {
      let prevLiked = false;
      let prevCount = 0;

      // Optimistic update — single pass to read previous state and apply update
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          prevLiked = post.isLiked ?? false;
          prevCount = post.likeCount;
          return { ...post, isLiked: true, likeCount: post.likeCount + 1 };
        })
      );

      try {
        await contentApi.likePost(postId);
      } catch (err) {
        // Revert on error
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, isLiked: prevLiked, likeCount: prevCount } : post
          )
        );
        throw err;
      }
    },
    [] // No dep on `posts` — reads state via functional updater
  );

  const unlikePost = useCallback(
    async (postId: string) => {
      let prevLiked = true;
      let prevCount = 0;

      // Optimistic update — single pass to read previous state and apply update
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          prevLiked = post.isLiked ?? true;
          prevCount = post.likeCount;
          return { ...post, isLiked: false, likeCount: post.likeCount - 1 };
        })
      );

      try {
        await contentApi.unlikePost(postId);
      } catch (err) {
        // Revert on error
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, isLiked: prevLiked, likeCount: prevCount } : post
          )
        );
        throw err;
      }
    },
    [] // No dep on `posts`
  );

  const incrementCommentCount = useCallback(
    (postId: string) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, commentCount: post.commentCount + 1 } : post
        )
      );
    },
    [] // No dep on `posts`
  );

  const incrementShareCount = useCallback(
    (postId: string) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, shareCount: post.shareCount + 1 } : post
        )
      );
    },
    [] // No dep on `posts`
  );

  // Auto-load on mount (immediate) and when feed type/limit changes (debounced)
  // so rapid tab switches do not hammer the API.
  const autoLoadDebounceMs = 280;
  const isFirstAutoLoad = useRef(true);
  const autoLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    if (!autoLoad) {
      return () => {
        isMountedRef.current = false;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }

    if (autoLoadTimerRef.current) {
      clearTimeout(autoLoadTimerRef.current);
      autoLoadTimerRef.current = null;
    }

    const run = () => {
      autoLoadTimerRef.current = null;
      void loadFeed();
    };

    if (isFirstAutoLoad.current) {
      isFirstAutoLoad.current = false;
      run();
    } else {
      autoLoadTimerRef.current = setTimeout(run, autoLoadDebounceMs);
    }

    return () => {
      isMountedRef.current = false;
      if (autoLoadTimerRef.current) {
        clearTimeout(autoLoadTimerRef.current);
        autoLoadTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoLoad, loadFeed]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    page,
    loadFeed,
    loadMore,
    refresh,
    optimisticUpdatePost,
    removePost,
    prependPost,
    likePost,
    unlikePost,
    incrementCommentCount,
    incrementShareCount,
  };
};

export default useFeed;
