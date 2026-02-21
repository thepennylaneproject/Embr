import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { MusicLicensingFlow } from '@/components/music/licensing/MusicLicensingFlow';
import { useAuth } from '@/contexts/AuthContext';

export default function MusicLicensingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<'video' | 'audio' | 'remix'>('video');
  const [showContentTypeSelector, setShowContentTypeSelector] = useState(true);

  const trackId = useMemo(() => {
    if (typeof router.query.trackId !== 'string') return '';
    return router.query.trackId;
  }, [router.query.trackId]);

  useEffect(() => {
    if (trackId) {
      setLoading(false);
    }
  }, [trackId]);

  const handleContentTypeSelect = useCallback((type: 'video' | 'audio' | 'remix') => {
    setContentType(type);
    setShowContentTypeSelector(false);
  }, []);

  const handleBack = useCallback(() => {
    setShowContentTypeSelector(true);
  }, []);

  if (loading || !trackId) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-embr-neutral-50">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="h-96 bg-embr-neutral-200 rounded-lg animate-pulse" />
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-embr-neutral-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/music" className="text-sm text-embr-accent-600 hover:text-embr-accent-700 mb-6 inline-block">
            ← Back to music discovery
          </Link>

          {showContentTypeSelector ? (
            // Content Type Selector
            <div className="bg-embr-neutral-100 border border-embr-neutral-200 rounded-lg p-8 space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-embr-accent-900 mb-2">Use This Track</h1>
                <p className="text-embr-accent-600">What type of content are you using this music in?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Video Card */}
                <button
                  onClick={() => handleContentTypeSelect('video')}
                  className="bg-embr-neutral-200 hover:bg-embr-neutral-300 border-2 border-embr-neutral-300 hover:border-embr-primary-400 rounded-lg p-6 text-center transition group"
                >
                  <div className="text-4xl mb-4">🎬</div>
                  <h3 className="font-bold text-embr-accent-900 group-hover:text-embr-primary-600 transition">Video</h3>
                  <p className="text-sm text-embr-accent-600 mt-2">TikTok, YouTube, Reels, etc.</p>
                </button>

                {/* Audio Card */}
                <button
                  onClick={() => handleContentTypeSelect('audio')}
                  className="bg-embr-neutral-200 hover:bg-embr-neutral-300 border-2 border-embr-neutral-300 hover:border-embr-primary-400 rounded-lg p-6 text-center transition group"
                >
                  <div className="text-4xl mb-4">🎵</div>
                  <h3 className="font-bold text-embr-accent-900 group-hover:text-embr-primary-600 transition">Audio</h3>
                  <p className="text-sm text-embr-accent-600 mt-2">Podcast, Streaming, Audio</p>
                </button>

                {/* Remix Card */}
                <button
                  onClick={() => handleContentTypeSelect('remix')}
                  className="bg-embr-neutral-200 hover:bg-embr-neutral-300 border-2 border-embr-neutral-300 hover:border-embr-primary-400 rounded-lg p-6 text-center transition group"
                >
                  <div className="text-4xl mb-4">🔄</div>
                  <h3 className="font-bold text-embr-accent-900 group-hover:text-embr-primary-600 transition">Remix</h3>
                  <p className="text-sm text-embr-accent-600 mt-2">Sample, Remix, Cover</p>
                </button>
              </div>
            </div>
          ) : (
            // Licensing Flow
            <div className="space-y-6">
              <button
                onClick={handleBack}
                className="text-sm text-embr-accent-600 hover:text-embr-accent-700 font-semibold flex items-center gap-2"
              >
                ← Change content type
              </button>

              <div className="bg-embr-neutral-50 rounded-lg p-4 border border-embr-neutral-200">
                <p className="text-sm text-embr-accent-600">
                  <span className="font-semibold text-embr-accent-900">Content Type:</span> {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                </p>
              </div>

              <MusicLicensingFlow
                trackId={trackId}
                contentType={contentType}
                contentId={user?.id || ''}
                onLicenseSuccess={() => {
                  // Redirect to dashboard after successful licensing
                  router.push('/music/dashboard');
                }}
              />
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
