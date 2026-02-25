import { ProtectedPageShell } from '@/components/layout';
import { GigDiscovery } from '@/components/gigs/GigDiscoveryNew';

export default function GigsPage() {
  return (
    <ProtectedPageShell
      title="Find Work"
      subtitle="Browse opportunities to earn. Filter by what matters to you."
      breadcrumbs={[{ label: 'Gigs' }]}
    >
      <GigDiscovery />
    </ProtectedPageShell>
  );
}
