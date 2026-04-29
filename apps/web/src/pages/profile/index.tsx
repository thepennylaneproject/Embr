import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useFollow } from '@/hooks/useFollow';
import { contentApi } from '@shared/api/content.api';
import { Post } from '@shared/types/content.types';
import { PostCard } from '@/components/content';
import { ProtectedPageShell } from '@/components/layout';
import { Button, PageState } from '@embr/ui';
import { Avatar } from '@/components/ui/Avatar';

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

  if (!user || loading) {
    return (
      <ProtectedPageShell breadcrumbs={[{ label: 'Profile' }]}>
        <PageState
          title="Loading profile"
          description="Please wait while we load your profile."
          isLoading
        />
      </ProtectedPageShell>
    );
  }

  const displayName = user.profile?.displayName || user.username;
  const avatarUrl = user.profile?.avatarUrl || '/default-avatar.png';

  return (
    <ProtectedPageShell
      title={displayName}
      subtitle={`@${user.username}`}
      breadcrumbs={[{ label: 'Profile' }]}
    >
      <div className="ui-card" data-padding="lg" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <Avatar src={avatarUrl} alt={displayName} name={displayName} size={80} className="flex-shrink-0" />
          <div style={{ flex: 1 }}>
            {user.profile?.bio && (
              <p style={{ marginTop: '0.5rem', color: 'var(--embr-muted-text)' }}>
                {user.profile.bio}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {user.profile?.postCount ?? posts.length}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>Posts</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {followerCount || user.profile?.followerCount || 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>Followers</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {followingCount || user.profile?.followingCount || 0}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>Following</div>
              </div>
            </div>
          </div>
          <Link href="/profile/edit">
            <Button type="button" variant="secondary">
              Edit profile
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: 'color-mix(in srgb, var(--embr-error) 15%, white)',
          border: '1px solid var(--embr-error)',
          borderRadius: 'var(--embr-radius-md)',
          color: 'var(--embr-error)',
          fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      <section>
        <h2 style={{ marginBottom: '1rem', fontWeight: '600' }}>Recent Posts</h2>
        {isLoadingPosts ? (
          <PageState title="Loading posts" description="Fetching your recent posts." isLoading />
        ) : postsError ? (
          <p style={{ color: 'var(--embr-error)' }}>{postsError}</p>
        ) : posts.length === 0 ? (
          <p style={{ color: 'var(--embr-muted-text)' }}>No posts yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </ProtectedPageShell>
  );
}
