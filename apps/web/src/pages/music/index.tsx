import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { TrackDiscovery } from '@/components/music/discovery/TrackDiscovery';
import { Button } from '@/components/ui';

export default function MusicDiscoveryPage() {
  const router = useRouter();

  const handleTrackSelect = useCallback((trackId: string) => {
    router.push(`/music/licensing/${trackId}`);
  }, [router]);

  const handleUseTrack = useCallback((trackId: string) => {
    router.push(`/music/licensing/${trackId}`);
  }, [router]);

  return (
    <ProtectedPageShell
      title="Music"
      subtitle="Discover and license tracks from creators."
      breadcrumbs={[{ label: 'Music' }]}
    >
      {/* Call to Action */}
      <div
        className="ui-card"
        data-padding="lg"
        style={{
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--embr-sun) 15%, white), color-mix(in srgb, var(--embr-warm-2) 12%, white))',
          border: '1px solid var(--embr-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: '700' }}>
              🎵 Share Your Music
            </h2>
            <p style={{ margin: 0, color: 'var(--embr-muted-text)' }}>
              Become an artist and publish your tracks. Earn money when creators use your music.
            </p>
          </div>
          <Link href="/music/artist/create">
            <Button type="button" style={{ whiteSpace: 'nowrap' }}>
              Create Artist Profile
            </Button>
          </Link>
        </div>
      </div>

      <TrackDiscovery
        onTrackSelect={handleTrackSelect}
        onUseTrack={handleUseTrack}
      />
    </ProtectedPageShell>
  );
}
