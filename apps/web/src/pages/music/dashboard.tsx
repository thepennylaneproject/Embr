import { ProtectedPageShell } from '@/components/layout';
import { CreatorRevenueDashboard } from '@/components/music/dashboard/CreatorRevenueDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { getMusicGateServerSideProps } from '@/lib/musicGate';

export const getServerSideProps = getMusicGateServerSideProps;

export default function MusicDashboardPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedPageShell
      title="Revenue Dashboard"
      subtitle="Track music earnings and usage."
      breadcrumbs={[{ label: 'Music', href: '/music' }, { label: 'Dashboard' }]}
    >
      <CreatorRevenueDashboard creatorId={user?.id || ''} />
    </ProtectedPageShell>
  );
}
