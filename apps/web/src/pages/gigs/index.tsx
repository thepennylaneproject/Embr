import { ProtectedPageShell } from '@/components/layout';
import { GigDiscovery } from '@/components/gigs/GigDiscovery';

export default function GigsPage() {
  return (
    <ProtectedPageShell
      title="Gigs"
      subtitle="Discover and apply to creator opportunities."
      breadcrumbs={[{ label: 'Gigs' }]}
    >
      <GigDiscovery />
    </ProtectedPageShell>
  );
}
