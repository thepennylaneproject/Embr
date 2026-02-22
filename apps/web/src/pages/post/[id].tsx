import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedPageShell } from '@/components/layout';
import { PostDetailPage } from '@/components/content';

export default function PostDetailRoute() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const postId = typeof router.query.id === 'string' ? router.query.id : '';

  if (!postId || loading) {
    return (
      <ProtectedPageShell breadcrumbs={[{ label: 'Post' }]}>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--embr-muted-text)' }}>
          {loading ? 'Loading post...' : 'Post not found'}
        </div>
      </ProtectedPageShell>
    );
  }

  return (
    <ProtectedPageShell breadcrumbs={[{ label: 'Feed', href: '/feed' }, { label: 'Post' }]}>
      <PostDetailPage postId={postId} currentUserId={user?.id} />
    </ProtectedPageShell>
  );
}
