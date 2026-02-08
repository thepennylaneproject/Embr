import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFollow } from '@/hooks/useFollow';
import { contentApi } from '@shared/api/content.api';
import { Post } from '@shared/types/content.types';
import { PostCard } from '@/components/content';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { followerCount, followingCount, getFollowCounts, error } = useFollow();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadCounts = async () => {
      await getFollowCounts(user.id);
    };

    loadCounts();
  }, [user?.id, getFollowCounts]);

  useEffect(() => {
    if (!user?.id) return;

    const loadPosts = async () => {
      try {
        setIsLoadingPosts(true);
        const response = await contentApi.getUserPosts(user.id, { page: 1, limit: 10 });
        setPosts(response.data);
      } catch (err: any) {
        setPostsError(err.response?.data?.message || 'Failed to load posts');
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadPosts();
  }, [user?.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Sign in to view your profile
          </h1>
          <p className="text-gray-600 mb-6">
            You need an account to view and manage your profile.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center px-6 py-2.5 bg-[#E8998D] text-white rounded-lg font-medium hover:bg-[#d88a7e]"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  const displayName = user.profile?.displayName || user.username;
  const avatarUrl = user.profile?.avatarUrl || '/default-avatar.png';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              <p className="text-gray-500">@{user.username}</p>
              {user.profile?.bio && (
                <p className="mt-2 text-gray-700">{user.profile.bio}</p>
              )}
            </div>
            <Link
              href="/profile/edit"
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit profile
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {user.profile?.postCount ?? posts.length}
              </p>
              <p className="text-sm text-gray-500">Posts</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {followerCount || user.profile?.followerCount || 0}
              </p>
              <p className="text-sm text-gray-500">Followers</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {followingCount || user.profile?.followingCount || 0}
              </p>
              <p className="text-sm text-gray-500">Following</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent posts</h2>
          {isLoadingPosts ? (
            <p className="text-gray-500">Loading posts...</p>
          ) : postsError ? (
            <p className="text-red-600">{postsError}</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-500">No posts yet.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
