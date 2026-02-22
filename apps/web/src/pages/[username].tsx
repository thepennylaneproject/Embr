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
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui';

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
      <AppShell breadcrumbs={[{ label: 'User Profile' }]}>
        <p style={{ color: 'var(--embr-muted-text)' }}>Loading profile...</p>
      </AppShell>
    );
  }

  if (error || !profileUser) {
    return (
      <AppShell breadcrumbs={[{ label: 'User Profile' }]}>
        <p style={{ color: 'var(--embr-error)' }}>{error || 'User not found'}</p>
        <Link href="/feed">
          <Button type="button" variant="secondary" style={{ marginTop: '0.5rem' }}>
            Back to feed
          </Button>
        </Link>
      </AppShell>
    );
  }

  const displayName = profileUser.profile?.displayName || profileUser.username;
  const avatarUrl = profileUser.profile?.avatarUrl || '/default-avatar.png';
  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <AppShell
      title={displayName}
      subtitle={`@${profileUser.username}`}
      breadcrumbs={[{ label: displayName }]}
    >
      <div className="ui-card" data-padding="lg" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <img
            src={avatarUrl}
            alt={displayName}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '999px',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            {profileUser.profile?.bio && (
              <p style={{ marginTop: '0.5rem', color: 'var(--embr-muted-text)' }}>
                {profileUser.profile.bio}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {profileUser.profile?.postCount ?? posts.length}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>Posts</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {followerCount || profileUser.profile?.followerCount || 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>Followers</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {followingCount || profileUser.profile?.followingCount || 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>Following</div>
              </div>
            </div>
          </div>
          {isOwnProfile ? (
            <Link href="/profile/edit">
              <Button type="button" variant="secondary">
                Edit profile
              </Button>
            </Link>
          ) : (
            <FollowButton
              userId={profileUser.id}
              initialIsFollowing={isFollowing}
            />
          )}
        </div>
      </div>

      <section>
        <h2 style={{ marginBottom: '1rem', fontWeight: '600' }}>Recent Posts</h2>
        {posts.length === 0 ? (
          <p style={{ color: 'var(--embr-muted-text)' }}>No posts yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
