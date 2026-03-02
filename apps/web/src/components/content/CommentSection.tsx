/**
 * CommentSection Component
 * Display and manage comments with nested replies
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useComments } from '@/hooks/useComments';
import { Comment } from '@shared/types/content.types';
import { Heart, MessageCircle, MoreVertical, Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onLike: (commentId: string) => Promise<void>;
  onUnlike: (commentId: string) => Promise<void>;
  onReply: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  depth?: number;
  currentUserId?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  onLike,
  onUnlike,
  onReply,
  onDelete,
  depth = 0,
  currentUserId,
}) => {
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [isLiking, setIsLiking] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const {
    comments: replies,
    isLoading: isLoadingReplies,
  } = useComments({
    postId,
    parentId: comment.id,
    autoLoad: false,
  });

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
        await onUnlike(comment.id);
      } else {
        await onLike(comment.id);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(previousIsLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  }, [comment.id, isLiked, likeCount, isLiking, onLike, onUnlike]);

  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
  });

  const canDelete = currentUserId === comment.authorId;

  return (
    <div className={`${depth > 0 ? 'ml-12 mt-4' : 'mt-4'}`}>
      <div className="flex gap-3">
        <Link href={`/@${comment.author.username}`}>
          <img
            src={comment.author.profile.avatarUrl || '/default-avatar.png'}
            alt={comment.author.profile.displayName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        </Link>

        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="bg-gray-50 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <Link
                href={`/@${comment.author.username}`}
                className="font-semibold text-gray-900 text-sm hover:underline"
              >
                {comment.author.profile.displayName}
              </Link>
              {canDelete && (
                <button
                  onClick={() => onDelete?.(comment.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
              )}
            </div>
            <p className="text-gray-900 text-sm whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>

          {/* Comment Actions */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{timeAgo}</span>

            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-1 hover:text-[#E8998D] transition-colors ${
                isLiked ? 'text-[#E8998D] font-medium' : ''
              }`}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {depth < 3 && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center gap-1 hover:text-[#E8998D] transition-colors"
              >
                <MessageCircle size={14} />
                <span>Reply</span>
              </button>
            )}

            {comment.replyCount && comment.replyCount > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="font-medium hover:text-[#E8998D] transition-colors"
              >
                {showReplies ? 'Hide' : `View ${comment.replyCount}`}{' '}
                {comment.replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {/* Nested Replies */}
          {showReplies && (
            <div className="mt-2">
              {isLoadingReplies ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm ml-12">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading replies...</span>
                </div>
              ) : (
                replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    postId={postId}
                    onLike={onLike}
                    onUnlike={onUnlike}
                    onReply={onReply}
                    onDelete={onDelete}
                    depth={depth + 1}
                    currentUserId={currentUserId}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface CommentSectionProps {
  postId: string;
  currentUserId?: string;
  className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUserId,
  className = '',
}) => {
  const {
    comments,
    isLoading,
    isLoadingMore,
    isCreating,
    error,
    hasMore,
    loadMore,
    createComment,
    deleteComment,
    likeComment,
    unlikeComment,
  } = useComments({ postId, autoLoad: true });

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const handleSubmitComment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!newComment.trim()) return;

      try {
        await createComment({
          content: newComment.trim(),
          parentId: replyingTo || undefined,
        });

        setNewComment('');
        setReplyingTo(null);
      } catch (error) {
        console.error('Failed to create comment:', error);
      }
    },
    [newComment, replyingTo, createComment]
  );

  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(commentId);
  }, []);

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (window.confirm('Delete this comment?')) {
        try {
          await deleteComment(commentId);
        } catch (error) {
          console.error('Failed to delete comment:', error);
        }
      }
    },
    [deleteComment]
  );

  if (isLoading && comments.length === 0) {
    return (
      <div className={`py-8 text-center ${className}`}>
        <Loader2 size={32} className="animate-spin text-[#E8998D] mx-auto mb-2" />
        <p className="text-gray-600 text-sm">Loading comments...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="flex gap-3">
          <img
            src="/default-avatar.png"
            alt="Your avatar"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1">
            {replyingTo && (
              <div className="mb-2 text-sm text-gray-600">
                Replying to comment{' '}
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-[#E8998D] hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-[#E8998D] resize-none"
                rows={3}
                maxLength={500}
                disabled={isCreating}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isCreating}
                className="absolute bottom-3 right-3 p-2 bg-[#E8998D] hover:bg-[#d88a7e] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors"
              >
                {isCreating ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Comments List */}
      {comments.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <MessageCircle size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onLike={likeComment}
              onUnlike={unlikeComment}
              onReply={handleReply}
              onDelete={handleDelete}
              currentUserId={currentUserId}
            />
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more comments'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
