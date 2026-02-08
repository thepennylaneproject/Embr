/**
 * PostDetailPage Component
 * Full post view with comments section
 */

'use client';

import React, { useEffect, useState } from 'react';
import { usePost } from '@/hooks/usePost';
import { PostCard } from './PostCard';
import { CommentSection } from './CommentSection';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface PostDetailPageProps {
  postId: string;
  currentUserId?: string;
}

export const PostDetailPage: React.FC<PostDetailPageProps> = ({
  postId,
  currentUserId,
}) => {
  const router = useRouter();
  const { post, isLoading, error, getPost } = usePost();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        await getPost(postId);
      } catch (err) {
        console.error('Failed to load post:', err);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadPost();
  }, [postId, getPost]);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    void router.push('/');
  };

  // Loading state
  if (isLoading && isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="mb-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          </div>

          {/* Post Skeleton */}
          <div className="bg-white rounded-2xl p-6 mb-8">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>

          <div className="flex items-center justify-center py-12">
            <Loader2 size={48} className="animate-spin text-[#E8998D]" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || (!post && !isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>

          <div className="bg-white rounded-2xl p-12 text-center">
            <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Post not found
            </h2>
            <p className="text-gray-600 mb-6">
              {error || "This post may have been deleted or doesn't exist."}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2.5 bg-[#E8998D] hover:bg-[#d88a7e] text-white rounded-lg font-medium transition-colors"
            >
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        {/* Post */}
        <div className="mb-8">
          <PostCard
            post={post}
            showActions={true}
            onComment={() => {
              // Scroll to comments
              const commentsSection = document.getElementById('comments-section');
              commentsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
        </div>

        {/* Comments Section */}
        <div id="comments-section" className="bg-white rounded-2xl p-6">
          <CommentSection postId={postId} currentUserId={currentUserId} />
        </div>

        {/* Related Posts (Optional Future Enhancement) */}
        {/* <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Related Posts</h3>
          <div className="space-y-4">
            // Related posts would go here
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default PostDetailPage;
