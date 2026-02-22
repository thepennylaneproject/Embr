import { ProtectedPageShell } from '@/components/layout';
import { CreatorRevenueDashboard } from '@/components/music/dashboard/CreatorRevenueDashboard';

export default function MusicDashboardPage() {
  return (
    <ProtectedPageShell
      title="Revenue Dashboard"
      subtitle="Track music earnings and usage."
      breadcrumbs={[{ label: 'Music', href: '/music' }, { label: 'Dashboard' }]}
    >
      <CreatorRevenueDashboard />
    </ProtectedPageShell>
  );
}
