import { useCallback } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { TrackDiscovery } from '@/components/music/discovery/TrackDiscovery';

export default function MusicDiscoveryPage() {
  const router = useRouter();

  const handleTrackSelect = useCallback((trackId: string) => {
    // Navigate to licensing flow for the selected track
    router.push(`/music/licensing/${trackId}`);
  }, [router]);

  const handleUseTrack = useCallback((trackId: string) => {
    // Navigate to licensing flow
    router.push(`/music/licensing/${trackId}`);
  }, [router]);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-embr-neutral-50">
        <TrackDiscovery
          onTrackSelect={handleTrackSelect}
          onUseTrack={handleUseTrack}
        />
      </main>
    </ProtectedRoute>
  );
}
