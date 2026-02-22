import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { TrackDiscovery } from '@/components/music/discovery/TrackDiscovery';

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
      <TrackDiscovery
        onTrackSelect={handleTrackSelect}
        onUseTrack={handleUseTrack}
      />
    </ProtectedPageShell>
  );
}
