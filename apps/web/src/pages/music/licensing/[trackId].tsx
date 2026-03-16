import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { Button } from '@embr/ui';
import { Music, CheckCircle, Lock, Share2 } from 'lucide-react';
import apiClient from '@/lib/api/client';

interface Track {
  id: string;
  title: string;
  artistName: string;
  price: number;
  licensingModel: string;
  allowMonetize: boolean;
  attributionRequired: boolean;
  audioUrl: string;
  imageUrl?: string;
  duration: number;
}

interface LicenseOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  allowed: boolean;
}

export default function MusicLicensingPage() {
  const router = useRouter();
  const { trackId } = router.query;

  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Fetch track details
  useEffect(() => {
    if (!trackId) return;

    const fetchTrack = async () => {
      try {
        const { data } = await apiClient.get(`/music/tracks/${trackId}`);
        setTrack(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to load track');
        setLoading(false);
      }
    };

    fetchTrack();
  }, [trackId]);

  const handleLicense = async () => {
    if (!track) return;

    if (track.price === 0) {
      // Free track - immediate access
      setStep('success');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      await apiClient.post(`/music/licensing/${track.id}/checkout`, {
        creatorId: track.id,
      });
      // Response data is intentionally not used — checkout confirmation is implicit (F-023)
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedPageShell
        title="License Music"
        breadcrumbs={[
          { label: 'Music', href: '/music' },
          { label: 'License' },
        ]}
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mx-auto"></div>
          <p style={{ marginTop: '1rem', color: 'var(--embr-muted-text)' }}>
            Loading track...
          </p>
        </div>
      </ProtectedPageShell>
    );
  }

  if (error && !track) {
    return (
      <ProtectedPageShell
        title="License Music"
        breadcrumbs={[
          { label: 'Music', href: '/music' },
          { label: 'License' },
        ]}
      >
        <div className="ui-card" data-padding="lg">
          <div style={{ color: 'var(--embr-error)', textAlign: 'center' }}>
            <p>{error}</p>
            <Link href="/music">
              <Button style={{ marginTop: '1rem' }}>Back to Music</Button>
            </Link>
          </div>
        </div>
      </ProtectedPageShell>
    );
  }

  if (!track) return null;

  const licenseOptions: LicenseOption[] = [
    {
      id: 'use',
      name: 'Personal Use',
      description: 'Use this track in your personal projects',
      icon: <Music size={24} />,
      allowed: true,
    },
    {
      id: 'monetize',
      name: 'Monetized Content',
      description: 'Use this track in content where you earn money',
      icon: <CheckCircle size={24} />,
      allowed: track.allowMonetize,
    },
    {
      id: 'remix',
      name: 'Remix & Modify',
      description: 'Create remixes and derivative works',
      icon: <Lock size={24} />,
      allowed: false,
    },
    {
      id: 'share',
      name: 'Share with Attribution',
      description: `Credit to: ${track.artistName}`,
      icon: <Share2 size={24} />,
      allowed: track.attributionRequired,
    },
  ];

  return (
    <ProtectedPageShell
      title="License Music"
      breadcrumbs={[
        { label: 'Music', href: '/music' },
        { label: track.title },
      ]}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {step === 'details' && (
          <>
            <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '2rem' }}>
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: 'var(--embr-radius-md)',
                    backgroundColor: 'var(--embr-bg)',
                    border: '2px solid var(--embr-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--embr-muted-text)',
                  }}
                >
                  <Music size={48} />
                </div>

                <div>
                  <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '700' }}>
                    {track.title}
                  </h1>
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--embr-muted-text)' }}>
                    By{' '}
                    <Link href={`/music/artist/${track.artistName}`}>
                      <span style={{ color: 'var(--embr-accent)', fontWeight: '600' }}>
                        {track.artistName}
                      </span>
                    </Link>
                  </p>

                  <div
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: 'var(--embr-accent)',
                      marginBottom: '1rem',
                    }}
                  >
                    {track.price === 0 ? '🎁 FREE' : `$${track.price.toFixed(2)}`}
                  </div>

                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--embr-radius-md)',
                      backgroundColor: 'color-mix(in srgb, var(--embr-sun) 15%, white)',
                      color: 'var(--embr-sun)',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {track.licensingModel} License
                  </span>
                </div>
              </div>
            </div>

            <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '700' }}>
                What You Can Do
              </h2>

              <div style={{ display: 'grid', gap: '1rem' }}>
                {licenseOptions.map((option) => (
                  <div
                    key={option.id}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--embr-radius-md)',
                      border: `1px solid var(--embr-border)`,
                      backgroundColor: option.allowed
                        ? 'color-mix(in srgb, var(--embr-accent) 8%, white)'
                        : 'color-mix(in srgb, var(--embr-muted-text) 5%, white)',
                      opacity: option.allowed ? 1 : 0.6,
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ color: option.allowed ? 'var(--embr-accent)' : 'var(--embr-muted-text)' }}>
                      {option.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: '600',
                          color: option.allowed ? 'var(--embr-text)' : 'var(--embr-muted-text)',
                        }}
                      >
                        {option.name}
                        {!option.allowed && ' (Not allowed)'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.9rem',
                          color: 'var(--embr-muted-text)',
                          marginTop: '0.25rem',
                        }}
                      >
                        {option.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem', backgroundColor: 'color-mix(in srgb, var(--embr-warm-2) 10%, white)' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--embr-muted-text)' }}>
                ✓ By licensing this track, you agree to the terms above. You'll receive instant access to use this music
                {track.attributionRequired && (
                  <>
                    , and you agree to{' '}
                    <strong>credit the original artist</strong>
                  </>
                )}
                .
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Button
                onClick={handleLicense}
                disabled={paymentLoading}
                style={{ flex: 1, minWidth: '200px' }}
              >
                {paymentLoading ? 'Processing...' : `Get License${track.price > 0 ? ` - $${track.price.toFixed(2)}` : ''}`}
              </Button>
              <Link href="/music" style={{ flex: 1 }}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={paymentLoading}
                  style={{ width: '100%' }}
                >
                  Browse More
                </Button>
              </Link>
            </div>

            {error && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  borderRadius: 'var(--embr-radius-md)',
                  backgroundColor: 'color-mix(in srgb, var(--embr-error) 15%, white)',
                  border: '1px solid var(--embr-error)',
                  color: 'var(--embr-error)',
                  fontSize: '0.9rem',
                }}
              >
                {error}
              </div>
            )}
          </>
        )}

        {step === 'success' && (
          <div className="ui-card" data-padding="lg" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              License Purchased!
            </h2>
            <p style={{ color: 'var(--embr-muted-text)', marginBottom: '2rem' }}>
              You can now use{' '}
              <strong>{track.title}</strong> by <strong>{track.artistName}</strong> in
              your content.
            </p>

            {track.attributionRequired && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--embr-radius-md)',
                  backgroundColor: 'color-mix(in srgb, var(--embr-sun) 12%, white)',
                  border: '1px solid var(--embr-border)',
                  marginBottom: '2rem',
                  textAlign: 'left',
                }}
              >
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                  📝 Remember to credit:
                </p>
                <code
                  style={{
                    display: 'block',
                    padding: '0.5rem',
                    backgroundColor: 'var(--embr-bg)',
                    borderRadius: 'var(--embr-radius-sm)',
                    fontSize: '0.85rem',
                    wordBreak: 'break-all',
                    color: 'var(--embr-accent)',
                  }}
                >
                  "{track.title}" by {track.artistName}
                </code>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/music" style={{ flex: 1, minWidth: '150px' }}>
                <Button style={{ width: '100%' }}>Back to Music</Button>
              </Link>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/feeds')}
                style={{ flex: 1, minWidth: '150px' }}
              >
                Create Post
              </Button>
            </div>
          </div>
        )}
      </div>
    </ProtectedPageShell>
  );
}
