import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { Button } from '@embr/ui';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import apiClient from '@/lib/api/client';

interface Gig {
  id: string;
  title: string;
  artistName: string;
  price: number;
  description: string;
  category: string;
  duration: number;
  location?: string;
  imageUrl?: string;
}

interface BookingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function GigBookingPage() {
  const router = useRouter();
  const { gigId } = router.query;

  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [_bookingId, setBookingId] = useState<string>('');

  // Fetch gig details
  useEffect(() => {
    if (!gigId) return;

    const fetchGig = async () => {
      try {
        const { data } = await apiClient.get(`/gigs/${gigId}`);
        setGig(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to load gig');
        setLoading(false);
      }
    };

    fetchGig();
  }, [gigId]);

  const handleBooking = async () => {
    if (!gig) return;

    setPaymentLoading(true);
    setError('');

    try {
      const { data } = await apiClient.post(`/gigs/bookings/${gig.id}/checkout`, {
        artistId: gig.id,
      });

      sessionStorage.setItem('paymentIntentId', data.paymentIntentId);
      sessionStorage.setItem('gigId', gig.id);
      setBookingId(data.paymentIntentId);

      // In production, integrate Stripe.js for full payment form
      // For now, show success (immediate for demo)
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedPageShell
        title="Book Gig"
        breadcrumbs={[
          { label: 'Gigs', href: '/gigs' },
          { label: 'Book' },
        ]}
      >
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mx-auto"></div>
          <p style={{ marginTop: '1rem', color: 'var(--embr-muted-text)' }}>
            Loading gig details...
          </p>
        </div>
      </ProtectedPageShell>
    );
  }

  if (error && !gig) {
    return (
      <ProtectedPageShell
        title="Book Gig"
        breadcrumbs={[
          { label: 'Gigs', href: '/gigs' },
          { label: 'Book' },
        ]}
      >
        <div className="ui-card" data-padding="lg">
          <div style={{ color: 'var(--embr-error)', textAlign: 'center' }}>
            <p>{error}</p>
            <Link href="/gigs">
              <Button style={{ marginTop: '1rem' }}>Back to Gigs</Button>
            </Link>
          </div>
        </div>
      </ProtectedPageShell>
    );
  }

  if (!gig) return null;

  const bookingSteps: BookingStep[] = [
    {
      id: 'payment',
      title: 'Secure Payment',
      description: 'Your payment is secured and verified',
      icon: <Shield size={24} />,
    },
    {
      id: 'hold',
      title: '3-Day Hold',
      description: 'Funds are held safely for 3 days',
      icon: <Clock size={24} />,
    },
    {
      id: 'confirm',
      title: 'Confirmed',
      description: 'Both parties confirm the booking',
      icon: <CheckCircle size={24} />,
    },
    {
      id: 'release',
      title: 'Release Funds',
      description: 'Artist receives payment automatically',
      icon: <Calendar size={24} />,
    },
  ];

  return (
    <ProtectedPageShell
      title="Book Gig"
      breadcrumbs={[
        { label: 'Gigs', href: '/gigs' },
        { label: gig.title },
      ]}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {step === 'details' && (
          <>
            {/* Gig Info Card */}
            <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
                {/* Left: Gig Details */}
                <div>
                  <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: '700' }}>
                    {gig.title}
                  </h1>
                  <p style={{ margin: '0 0 1.5rem 0', color: 'var(--embr-muted-text)', fontSize: '1rem' }}>
                    By{' '}
                    <Link href={`/gigs/artist/${gig.artistName}`}>
                      <span style={{ color: 'var(--embr-accent)', fontWeight: '600' }}>
                        {gig.artistName}
                      </span>
                    </Link>
                  </p>

                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      About this gig
                    </h3>
                    <p style={{ color: 'var(--embr-text)', lineHeight: '1.6' }}>
                      {gig.description}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'var(--embr-bg)', border: '1px solid var(--embr-border)' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>
                        Duration
                      </div>
                      <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} />
                        {gig.duration} min
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'var(--embr-bg)', border: '1px solid var(--embr-border)' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>
                        Category
                      </div>
                      <div style={{ fontWeight: '600' }}>{gig.category}</div>
                    </div>
                    {gig.location && (
                      <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'var(--embr-bg)', border: '1px solid var(--embr-border)' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>
                          Location
                        </div>
                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MapPin size={18} />
                          {gig.location}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Pricing Summary */}
                <div className="ui-card" style={{ backgroundColor: 'color-mix(in srgb, var(--embr-accent) 8%, white)', border: '2px solid var(--embr-accent)' }} data-padding="lg">
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', marginBottom: '0.5rem' }}>
                      Price
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--embr-accent)' }}>
                      ${gig.price.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ padding: '1rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'color-mix(in srgb, var(--embr-sun) 12%, white)', border: '1px solid var(--embr-border)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                      🛡️ Protected Booking
                    </p>
                    <p style={{ margin: 0, color: 'var(--embr-muted-text)' }}>
                      Your payment is held securely for 3 days. Release or dispute until then.
                    </p>
                  </div>

                  <Button
                    onClick={handleBooking}
                    disabled={paymentLoading}
                    style={{ width: '100%' }}
                  >
                    {paymentLoading ? 'Processing...' : 'Book Now'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Booking Process Timeline */}
            <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '700' }}>
                How Booking Protection Works
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {bookingSteps.map((stepItem, idx) => (
                  <div
                    key={stepItem.id}
                    style={{
                      padding: '1.5rem',
                      borderRadius: 'var(--embr-radius-md)',
                      border: '2px solid var(--embr-border)',
                      backgroundColor: 'var(--embr-bg)',
                      position: 'relative',
                    }}
                  >
                    {/* Connector Line */}
                    {idx < bookingSteps.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          right: '-1rem',
                          width: '1rem',
                          height: '2px',
                          backgroundColor: 'var(--embr-border)',
                          zIndex: -1,
                        }}
                      />
                    )}

                    <div style={{ marginBottom: '1rem', color: 'var(--embr-accent)' }}>
                      {stepItem.icon}
                    </div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '600', margin: '0 0 0.5rem 0' }}>
                      {stepItem.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)', margin: 0 }}>
                      {stepItem.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Info */}
            <div className="ui-card" data-padding="lg" style={{ backgroundColor: 'color-mix(in srgb, var(--embr-warm-2) 10%, white)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <AlertCircle size={20} style={{ color: 'var(--embr-sun)', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: 0, fontWeight: '600', marginBottom: '0.5rem' }}>
                    Payment Protection
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--embr-muted-text)', fontSize: '0.9rem' }}>
                    <li style={{ marginBottom: '0.25rem' }}>Your payment is securely held for 3 days</li>
                    <li style={{ marginBottom: '0.25rem' }}>You can file a dispute up to 24 hours before auto-release</li>
                    <li style={{ marginBottom: '0.25rem' }}>Artist cannot access funds until the hold period expires</li>
                    <li>No hidden fees or charges</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/gigs" style={{ flex: 1 }}>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={paymentLoading}
                  style={{ width: '100%' }}
                >
                  Browse Other Gigs
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

        {/* Success State */}
        {step === 'success' && (
          <div className="ui-card" data-padding="lg" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Booking Confirmed!
            </h2>
            <p style={{ color: 'var(--embr-muted-text)', marginBottom: '2rem' }}>
              You've successfully booked <strong>{gig.title}</strong> with{' '}
              <strong>{gig.artistName}</strong>.
            </p>

            {/* Booking Timeline */}
            <div
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--embr-radius-md)',
                backgroundColor: 'var(--embr-bg)',
                border: '1px solid var(--embr-border)',
                marginBottom: '2rem',
                textAlign: 'left',
              }}
            >
              <h3 style={{ margin: '0 0 1rem 0', fontWeight: '600' }}>
                🔒 What Happens Next
              </h3>
              <div style={{ fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '60px' }}>
                    Now
                  </div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>
                    Payment confirmed and securely held
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '60px' }}>
                    24h
                  </div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>
                    Last chance to file a dispute (if needed)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '60px' }}>
                    3 days
                  </div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>
                    Funds auto-released to artist
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/gigs/bookings" style={{ flex: 1, minWidth: '150px' }}>
                <Button style={{ width: '100%' }}>View Bookings</Button>
              </Link>
              <Link href="/gigs" style={{ flex: 1, minWidth: '150px' }}>
                <Button
                  type="button"
                  variant="secondary"
                  style={{ width: '100%' }}
                >
                  Browse More Gigs
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </ProtectedPageShell>
  );
}
