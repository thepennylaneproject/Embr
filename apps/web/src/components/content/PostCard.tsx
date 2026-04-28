/**
 * PostCard Component
 * Displays a post with media, engagement actions, and user info
 */

'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Music } from 'lucide-react';
import { Post } from '@shared/types/content.types';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { isMusicEnabled } from '@/lib/features';

interface PostCardProps {
  post: Post;
  onLike?: (postId: string) => Promise<void>;
  onUnlike?: (postId: string) => Promise<void>;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  className?: string;
  showActions?: boolean;
}

export const PostCard: React.FC<PostCardProps> = React.memo(({
  post,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onBookmark,
  className = '',
  showActions = true,
}) => {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = useCallback(async () => {
    if (isLiking) return;

    setIsLiking(true);
    const previousIsLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    try {
      if (isLiked) {
        await onUnlike?.(post.id);
      } else {
        await onLike?.(post.id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
      console.error('Failed to toggle like:', error);
    } finally {
      setIsLiking(false);
    }
  }, [post.id, isLiked, likeCount, isLiking, onLike, onUnlike]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  return (
    <article
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow ${className}`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <Link
          href={`/@${post.author.username}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image
            src={post.author.profile.avatarUrl || '/default-avatar.png'}
            alt={post.author.profile.displayName}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h3 className="font-semibold text-gray-900">
              {post.author.profile.displayName}
            </h3>
            <p className="text-sm text-gray-500">
              @{post.author.username} · {timeAgo}
            </p>
          </div>
        </Link>

        <button
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="More options"
        >
          <MoreHorizontal size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-900 whitespace-pre-wrap break-words">
            {post.content}
          </p>
          {/* Hashtags */}
          {post.hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {post.hashtags.map((tag) => (
                <Link
                  key={tag}
                  href={`/explore/tags/${tag}`}
                  className="text-[#E8998D] hover:underline text-sm font-medium"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media */}
      {post.mediaUrl && (
        <Link href={`/post/${post.id}`} className="block relative">
          {post.type === 'video' ? (
            <div className="relative bg-black aspect-video">
              <video
                src={post.mediaUrl}
                poster={post.thumbnailUrl}
                className="w-full h-full object-contain"
                controls
                preload="metadata"
              />
              {post.duration && (
                <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  {Math.floor(post.duration / 60)}:{String(post.duration % 60).padStart(2, '0')}
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full max-h-[600px] min-h-[200px] bg-gray-50">
              <Image
                src={post.mediaUrl}
                alt="Post media"
                fill
                sizes="(max-width: 768px) 100vw, 680px"
                className="object-contain"
              />
            </div>
          )}
          {post.isProcessing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-2" />
                <p className="text-sm">Processing video...</p>
              </div>
            </div>
          )}
        </Link>
      )}

      {/* Music */}
      {isMusicEnabled() && post.musicTrackId && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 flex items-center gap-3">
          <Music size={18} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/music/licensing/${post.musicTrackId}`}
              className="text-sm font-medium text-gray-900 hover:text-amber-600 truncate block"
            >
              🎵 Music added to this post
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-4">
        <span>{formatNumber(post.viewCount)} views</span>
        {likeCount > 0 && <span>{formatNumber(likeCount)} likes</span>}
        {post.commentCount > 0 && (
          <span>{formatNumber(post.commentCount)} comments</span>
        )}
        {post.shareCount > 0 && <span>{formatNumber(post.shareCount)} shares</span>}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-around">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isLiked
                ? 'text-[#E8998D] bg-[#E8998D]/10'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart
              size={20}
              fill={isLiked ? 'currentColor' : 'none'}
              className="transition-all"
            />
            <span className="font-medium">
              {likeCount > 0 ? formatNumber(likeCount) : 'Like'}
            </span>
          </button>

          <button
            onClick={() => onComment?.(post.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <MessageCircle size={20} />
            <span className="font-medium">
              {post.commentCount > 0 ? formatNumber(post.commentCount) : 'Comment'}
            </span>
          </button>

          <button
            onClick={() => onShare?.(post.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Share2 size={20} />
            <span className="font-medium">
              {post.shareCount > 0 ? formatNumber(post.shareCount) : 'Share'}
            </span>
          </button>

          <button
            onClick={() => onBookmark?.(post.id)}
            className={`p-2 rounded-lg transition-colors ${
              post.isBookmarked
                ? 'text-[#E8998D] bg-[#E8998D]/10'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bookmark size={20} fill={post.isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      )}
    </article>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;
