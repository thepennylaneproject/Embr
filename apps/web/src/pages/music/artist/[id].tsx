import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
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
    }
  }, [artistId]);

  if (loading || !artistId) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-embr-neutral-50">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="h-96 bg-embr-neutral-200 rounded-lg animate-pulse" />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-embr-neutral-50">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="bg-embr-primary-100/30 border border-embr-primary-300 rounded-lg p-6 text-embr-primary-700">
              <p className="font-semibold mb-2">Error loading artist profile</p>
              <p className="text-sm mb-4">{error}</p>
              <Link href="/music" className="text-embr-primary-600 hover:underline text-sm font-semibold">
                ← Back to music discovery
              </Link>
            </div>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-embr-neutral-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/music" className="text-sm text-embr-accent-600 hover:text-embr-accent-700 mb-6 inline-block">
            ← Back to music discovery
          </Link>
          <ArtistDashboard artistId={artistId} />
        </div>
      </main>
    </ProtectedRoute>
  );
}
