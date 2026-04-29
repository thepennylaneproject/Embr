/**
 * Feed Component
 * Infinite scroll feed with virtualization and pull-to-refresh
 */

'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { PostCard } from './PostCard';
import { FeedType } from '@shared/types/content.types';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { EmptyListState } from '@/components/ui/EmptyListState';
import { copy } from '@/lib/copy';

interface FeedProps {
  feedType?: FeedType;
  limit?: number;
  className?: string;
  onPostClick?: (postId: string) => void;
}

export const Feed: React.FC<FeedProps> = ({
  feedType = FeedType.FOR_YOU,
  limit = 20,
  className = '',
  onPostClick,
}) => {
  const {
    posts,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    hasMore,
    loadMore,
    refresh,
    likePost,
    unlikePost,
    incrementCommentCount,
    incrementShareCount,
  } = useFeed({ feedType, limit, autoLoad: true });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (isLoadingMore || !hasMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.5 }
    );

    if (loadMoreTriggerRef.current) {
      observerRef.current.observe(loadMoreTriggerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loadMore]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleCommentClick = useCallback(
    (postId: string) => {
      incrementCommentCount(postId);
      onPostClick?.(postId);
    },
    [incrementCommentCount, onPostClick]
  );

  const handleShareClick = useCallback(
    (postId: string) => {
      incrementShareCount(postId);
      // Open share modal or copy link
      if (navigator.share) {
        navigator.share({
          title: 'Check out this post on Embr',
          url: `${window.location.origin}/post/${postId}`,
        });
      } else {
        navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
        // Show toast notification
      }
    },
    [incrementShareCount]
  );

  // Initial loading state
  if (isLoading && posts.length === 0) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-[#E8998D] mx-auto mb-4" />
          <p className="text-gray-600">Loading your feed...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && posts.length === 0) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to load feed
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-6 py-2.5 bg-[#E8998D] hover:bg-[#d88a7e] text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0 && !isLoading) {
    const following = feedType === FeedType.FOLLOWING;
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <EmptyListState
          className="max-w-md w-full"
          icon={<RefreshCw size={40} className="mx-auto text-gray-400" aria-hidden />}
          title={following ? copy.emptyStates.noPostsFollowing : copy.emptyStates.noPosts}
          description={following ? copy.emptyStates.noPostsFollowingDesc : copy.emptyStates.noPostsDesc}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Refresh Button */}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw
            size={18}
            className={isRefreshing ? 'animate-spin' : ''}
          />
          <span className="font-medium">
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </span>
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={likePost}
            onUnlike={unlikePost}
            onComment={handleCommentClick}
            onShare={handleShareClick}
          />
        ))}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div
          ref={loadMoreTriggerRef}
          className="py-8 flex items-center justify-center"
        >
          {isLoadingMore && (
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-[#E8998D] mx-auto mb-2" />
              <p className="text-gray-600 text-sm">Loading more posts...</p>
            </div>
          )}
        </div>
      )}

      {/* End of Feed */}
      {!hasMore && posts.length > 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-500 text-sm">
            You've reached the end! 🎉
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && posts.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default Feed;
