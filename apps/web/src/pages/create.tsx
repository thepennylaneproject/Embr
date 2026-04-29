import { ProtectedPageShell } from '@/components/layout';
import { PostCreator } from '@/components/content';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { copy } from '@/lib/copy';

export default function CreatePostPage() {
  const router = useRouter();

  const handlePostCreated = (postId: string) => {
    // Redirect to the new post
    router.push(`/post/${postId}`);
  };

  const handleCancel = () => {
    // Go back to feed
    router.push('/feed');
  };

  return (
    <ProtectedPageShell
      title="Create Post"
      breadcrumbs={[
        { label: 'Feed', href: '/feed' },
        { label: 'Create' },
      ]}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/feed">
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--embr-accent)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
              }}
            >
              <ArrowLeft size={18} aria-hidden />
              {copy.actions.backToFeed}
            </button>
          </Link>
        </div>

        <PostCreator
          onPostCreated={handlePostCreated}
          onCancel={handleCancel}
        />
      </div>
    </ProtectedPageShell>
  );
}
