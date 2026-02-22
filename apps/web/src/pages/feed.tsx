import { ProtectedPageShell } from '@/components/layout';
import { FeedTabs, PostCreator } from '@/components/content';

export default function FeedPage() {
  return (
    <ProtectedPageShell
      title="Feed"
      subtitle="Stay up to date with what's new from creators."
      breadcrumbs={[{ label: 'Feed' }]}
    >
      <PostCreator className="mb-6" />
      <FeedTabs />
    </ProtectedPageShell>
  );
}
