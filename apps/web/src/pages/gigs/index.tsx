import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { GigDiscovery } from '@/components/gigs/GigDiscoveryNew';
import { copy } from '@/lib/copy';

export default function GigsPage() {
  return (
    <ProtectedPageShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: '700', fontSize: '1.5rem' }}>{copy.jobs.findWork.title}</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.95rem' }}>{copy.jobs.findWork.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/gigs/manage">
            <button style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              {copy.jobs.myGigs}
            </button>
          </Link>
          <Link href="/gigs/post">
            <button style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>
              {copy.jobs.postGig}
            </button>
          </Link>
        </div>
      </div>
      <GigDiscovery />
    </ProtectedPageShell>
  );
}
