import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { GigDiscovery } from '@/components/gigs/GigDiscoveryNew';

export default function GigsPage() {
  return (
    <ProtectedPageShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: '700', fontSize: '1.5rem' }}>Find Work</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>Browse opportunities to earn. Filter by what matters to you.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/gigs/manage">
            <button style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              My Gigs
            </button>
          </Link>
          <Link href="/gigs/post">
            <button style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              + Post a Gig
            </button>
          </Link>
        </div>
      </div>
      <GigDiscovery />
    </ProtectedPageShell>
  );
}
