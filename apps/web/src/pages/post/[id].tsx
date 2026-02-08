import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { PostDetailPage } from '@/components/content';

export default function PostDetailRoute() {
  const router = useRouter();
  const { user } = useAuth();
  const postId = typeof router.query.id === 'string' ? router.query.id : '';

  if (!postId) {
    return null;
  }

  return <PostDetailPage postId={postId} currentUserId={user?.id} />;
}
