import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/contexts/AuthContext';
import { useFollow } from '@/hooks/useFollow';
import { contentApi } from '@shared/api/content.api';
import { Post } from '@shared/types/content.types';
import { PostCard } from '@/components/content';
import { FollowButton } from '@/components/social/FollowButton';

export default function UserProfilePage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { isFollowing, getFollowCounts, checkFollowStatus, followerCount, followingCount } =
    useFollow();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const username = useMemo(() => {
    if (typeof router.query.username !== 'string') return '';
    return router.query.username.startsWith('@')
      ? router.query.username.slice(1)
      : router.query.username;
  }, [router.query.username]);

  useEffect(() => {
    if (!username) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userData = await usersApi.getUserByUsername(username);
        setProfileUser(userData);

        const postsResponse = await contentApi.getUserPosts(userData.id, {
          page: 1,
          limit: 10,
        });
        setPosts(postsResponse.data);

        if (currentUser?.id) {
          await Promise.all([
            getFollowCounts(userData.id),
            checkFollowStatus(currentUser.id, userData.id),
          ]);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [username, currentUser?.id, getFollowCounts, checkFollowStatus]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (error || !profileUser) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-red-600">{error || 'User not found'}</p>
          <Link href="/feed" className="text-[#E8998D] hover:underline">
            Back to feed
          </Link>
        </div>
      </main>
    );
  }

  const displayName = profileUser.profile?.displayName || profileUser.username;
  const avatarUrl = profileUser.profile?.avatarUrl || '/default-avatar.png';
  const isOwnProfile = currentUser?.id === profileUser.id;

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
              <p className="text-gray-500">@{profileUser.username}</p>
              {profileUser.profile?.bio && (
                <p className="mt-2 text-gray-700">{profileUser.profile.bio}</p>
              )}
            </div>
            {isOwnProfile ? (
              <Link
                href="/profile/edit"
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit profile
              </Link>
            ) : (
              <FollowButton
                userId={profileUser.id}
                initialIsFollowing={isFollowing}
              />
            )}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {profileUser.profile?.postCount ?? posts.length}
              </p>
              <p className="text-sm text-gray-500">Posts</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {followerCount || profileUser.profile?.followerCount || 0}
              </p>
              <p className="text-sm text-gray-500">Followers</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">
                {followingCount || profileUser.profile?.followingCount || 0}
              </p>
              <p className="text-sm text-gray-500">Following</p>
            </div>
          </div>
        </header>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent posts</h2>
          {posts.length === 0 ? (
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
