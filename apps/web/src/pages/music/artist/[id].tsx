import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { ArtistDashboard } from '@/components/music/artist/ArtistDashboard';

export default function ArtistProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const artistId = useMemo(() => {
    if (typeof router.query.id !== 'string') return '';
    return router.query.id;
  }, [router.query.id]);

  useEffect(() => {
    if (artistId) {
      setLoading(false);
    } else if (typeof router.query.id !== 'undefined') {
      setError('Artist not found.');
      setLoading(false);
    }
  }, [artistId, router.query.id]);

  if (loading || !artistId) {
    return (
      <ProtectedPageShell breadcrumbs={[{ label: 'Music', href: '/music' }, { label: 'Artist' }]}>
        <div style={{ height: '400px', backgroundColor: 'var(--embr-border)', borderRadius: 'var(--embr-radius-lg)', animation: 'pulse 2s infinite' }} />
      </ProtectedPageShell>
    );
  }

  if (error) {
    return (
      <ProtectedPageShell breadcrumbs={[{ label: 'Music', href: '/music' }, { label: 'Artist' }]}>
        <div className="ui-card" data-padding="lg" style={{ borderColor: 'var(--embr-error)', borderWidth: '1px', backgroundColor: 'color-mix(in srgb, var(--embr-error) 12%, white)' }}>
          <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--embr-error)' }}>Error loading artist profile</p>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--embr-error)' }}>{error}</p>
        </div>
      </ProtectedPageShell>
    );
  }

  return (
    <ProtectedPageShell breadcrumbs={[{ label: 'Music', href: '/music' }, { label: 'Artist' }]}>
      <ArtistDashboard artistId={artistId} />
    </ProtectedPageShell>
  );
}
