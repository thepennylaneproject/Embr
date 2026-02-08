/**
 * useFeed Hook
 * Manages feed loading with infinite scroll and optimistic updates
 */

import { useState, useCallback, useEffect, useRef } from 'react';
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

  const loadFeed = useCallback(async () => {
    if (isLoading || isLoadingMore) return;

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
      });

      if (isMountedRef.current) {
        setPosts(response.data);
        setHasMore(response.meta.hasMore);
        setPage(1);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      const errorMessage = err.response?.data?.message || 'Failed to load feed';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [feedType, limit, isLoading, isLoadingMore]);

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
  const likePost = useCallback(
    async (postId: string) => {
      // Optimistic update
      const currentPost = posts.find((p) => p.id === postId);
      if (!currentPost) return;

      optimisticUpdatePost(postId, {
        isLiked: true,
        likeCount: currentPost.likeCount + 1,
      });

      try {
        await contentApi.likePost(postId);
      } catch (err) {
        // Revert on error
        const post = posts.find((p) => p.id === postId);
        if (post) {
          optimisticUpdatePost(postId, {
            isLiked: false,
            likeCount: post.likeCount - 1,
          });
        }
        throw err;
      }
    },
    [posts, optimisticUpdatePost]
  );

  const unlikePost = useCallback(
    async (postId: string) => {
      // Optimistic update
      const currentPost = posts.find((p) => p.id === postId);
      if (!currentPost) return;

      optimisticUpdatePost(postId, {
        isLiked: false,
        likeCount: currentPost.likeCount - 1,
      });

      try {
        await contentApi.unlikePost(postId);
      } catch (err) {
        // Revert on error
        const post = posts.find((p) => p.id === postId);
        if (post) {
          optimisticUpdatePost(postId, {
            isLiked: true,
            likeCount: post.likeCount + 1,
          });
        }
        throw err;
      }
    },
    [posts, optimisticUpdatePost]
  );

  const incrementCommentCount = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (post) {
        optimisticUpdatePost(postId, {
          commentCount: post.commentCount + 1,
        });
      }
    },
    [posts, optimisticUpdatePost]
  );

  const incrementShareCount = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (post) {
        optimisticUpdatePost(postId, {
          shareCount: post.shareCount + 1,
        });
      }
    },
    [posts, optimisticUpdatePost]
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadFeed();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoLoad]); // Only run once on mount

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
