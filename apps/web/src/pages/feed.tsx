import { ProtectedPageShell } from '@/components/layout';
import { FeedTabs } from '@/components/content';

export default function FeedPage() {
  return (
    <ProtectedPageShell
      title="Feed"
      subtitle="Stay up to date with what's new from creators."
      breadcrumbs={[{ label: 'Feed' }]}
    >
      <FeedTabs />
    </ProtectedPageShell>
  );
}
