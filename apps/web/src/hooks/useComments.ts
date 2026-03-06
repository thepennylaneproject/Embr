/**
 * useComments Hook
 * Manages comments and nested replies with optimistic updates
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { contentApi } from '@shared/api/content.api';
import { Comment, CreateCommentInput, UpdateCommentInput } from '@shared/types/content.types';

interface UseCommentsParams {
  postId: string;
  parentId?: string;
  limit?: number;
  autoLoad?: boolean;
}

interface UseCommentsReturn {
  // State
  comments: Comment[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isCreating: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Actions
  loadComments: () => Promise<void>;
  loadMore: () => Promise<void>;
  createComment: (data: CreateCommentInput) => Promise<Comment>;
  updateComment: (commentId: string, data: UpdateCommentInput) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
  likeComment: (commentId: string) => Promise<void>;
  unlikeComment: (commentId: string) => Promise<void>;
  optimisticUpdateComment: (commentId: string, updates: Partial<Comment>) => void;
  prependComment: (comment: Comment) => void;
  removeComment: (commentId: string) => void;
}

export const useComments = (params: UseCommentsParams): UseCommentsReturn => {
  const { postId, parentId, limit = 20, autoLoad = true } = params;

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const isMountedRef = useRef(true);

  const loadComments = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = parentId
        ? await contentApi.getReplies(postId, parentId, { page: 1, limit })
        : await contentApi.getComments(postId, { page: 1, limit, parentId });

      if (isMountedRef.current) {
        setComments(response.data);
        setHasMore(response.meta.hasMore);
        setPage(1);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load comments';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [postId, parentId, limit, isLoading]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    try {
      setIsLoadingMore(true);
      setError(null);

      const nextPage = page + 1;
      const response = parentId
        ? await contentApi.getReplies(postId, parentId, { page: nextPage, limit })
        : await contentApi.getComments(postId, { page: nextPage, limit, parentId });

      if (isMountedRef.current) {
        setComments((prev) => [...prev, ...response.data]);
        setHasMore(response.meta.hasMore);
        setPage(nextPage);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load more comments';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [hasMore, isLoadingMore, page, postId, parentId, limit]);

  const createComment = useCallback(
    async (data: CreateCommentInput): Promise<Comment> => {
      try {
        setIsCreating(true);
        setError(null);

        const newComment = await contentApi.createComment(postId, data);

        if (isMountedRef.current) {
          // Add to beginning of list
          setComments((prev) => [newComment, ...prev]);
        }

        return newComment;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to create comment';
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        throw new Error(errorMessage);
      } finally {
        if (isMountedRef.current) {
          setIsCreating(false);
        }
      }
    },
    [postId]
  );

  const updateComment = useCallback(
    async (commentId: string, data: UpdateCommentInput): Promise<Comment> => {
      try {
        setError(null);

        const updatedComment = await contentApi.updateComment(postId, commentId, data);

        if (isMountedRef.current) {
          setComments((prev) =>
            prev.map((comment) =>
              comment.id === commentId ? updatedComment : comment
            )
          );
        }

        return updatedComment;
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to update comment';
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        throw new Error(errorMessage);
      }
    },
    [postId]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      try {
        setError(null);

        await contentApi.deleteComment(postId, commentId);

        if (isMountedRef.current) {
          setComments((prev) => prev.filter((comment) => comment.id !== commentId));
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to delete comment';
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        throw new Error(errorMessage);
      }
    },
    [postId]
  );

  const likeComment = useCallback(
    async (commentId: string) => {
      // Optimistic update
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, isLiked: true, likeCount: comment.likeCount + 1 }
            : comment
        )
      );

      try {
        await contentApi.likeComment(postId, commentId);
      } catch (err) {
        // Revert on error
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? { ...comment, isLiked: false, likeCount: comment.likeCount - 1 }
              : comment
          )
        );
        throw err;
      }
    },
    [postId]
  );

  const unlikeComment = useCallback(
    async (commentId: string) => {
      // Optimistic update
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, isLiked: false, likeCount: comment.likeCount - 1 }
            : comment
        )
      );

      try {
        await contentApi.unlikeComment(postId, commentId);
      } catch (err) {
        // Revert on error
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? { ...comment, isLiked: true, likeCount: comment.likeCount + 1 }
              : comment
          )
        );
        throw err;
      }
    },
    [postId]
  );

  const optimisticUpdateComment = useCallback(
    (commentId: string, updates: Partial<Comment>) => {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId ? { ...comment, ...updates } : comment
        )
      );
    },
    []
  );

  const prependComment = useCallback((comment: Comment) => {
    setComments((prev) => [comment, ...prev]);
  }, []);

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  }, []);

  // Auto-load on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (autoLoad) {
      loadComments();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoLoad]); // Only run once on mount

  return {
    comments,
    isLoading,
    isLoadingMore,
    isCreating,
    error,
    hasMore,
    page,
    loadComments,
    loadMore,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    unlikeComment,
    optimisticUpdateComment,
    prependComment,
    removeComment,
  };
};

export default useComments;
