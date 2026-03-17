import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { Button } from '@embr/ui';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { gigsApi, applicationsApi } from '@shared/api/gigs.api';
import type { GigWithDetails } from '@embr/types';

interface BookingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function GigBookingPage() {
  const router = useRouter();
  const { gigId } = router.query;

  const [gig, setGig] = useState<GigWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'success'>('details');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!gigId) return;
    gigsApi
      .getById(gigId as string)
      .then(setGig)
      .catch((err: any) => setError(err.response?.data?.message || err.message || 'Failed to load gig'))
      .finally(() => setLoading(false));
  }, [gigId]);

  const handleBooking = async () => {
    if (!gig) return;
    setBookingLoading(true);
    setError('');
    setFormError('');

    if (coverLetter.trim().length < 100) {
      setFormError('Please provide a message of at least 100 characters describing your interest.');
      setBookingLoading(false);
      return;
    }
    if (relevantExperience.trim().length < 50) {
      setFormError('Please describe your relevant experience (at least 50 characters).');
      setBookingLoading(false);
      return;
    }

    try {
      const application = await applicationsApi.create({
        gigId: gig.id,
        coverLetter: coverLetter.trim(),
        proposedBudget: gig.budgetMin,
        proposedTimeline: gig.estimatedDuration ?? 7,
        portfolioLinks: [],
        relevantExperience: relevantExperience.trim(),
        milestones: [],
      });

      setApplicationId(application.id);
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to submit booking request');
    } finally {
      setBookingLoading(false);
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
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--embr-muted-text)' }}>
          Loading gig details...
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
      id: 'apply',
      title: 'Submit Request',
      description: 'Send your booking request to the gig creator',
      icon: <Shield size={24} />,
    },
    {
      id: 'review',
      title: 'Creator Reviews',
      description: 'Creator reviews and accepts your application',
      icon: <Clock size={24} />,
    },
    {
      id: 'confirm',
      title: 'Confirmed',
      description: 'Both parties agree on terms and milestones',
      icon: <CheckCircle size={24} />,
    },
    {
      id: 'complete',
      title: 'Get it Done',
      description: 'Work is completed and payment released',
      icon: <Calendar size={24} />,
    },
  ];

  return (
    <ProtectedPageShell
      title="Book Gig"
      breadcrumbs={[
        { label: 'Gigs', href: '/gigs' },
        { label: gig.title, href: `/gigs/${gig.id}` },
        { label: 'Book' },
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
                  <p style={{ margin: '0 0 0.5rem 0', color: 'var(--embr-muted-text)', fontSize: '0.9rem' }}>
                    {gig.category.replace('_', ' ')} ·{' '}
                    {gig.creator?.profile?.displayName || gig.creator?.username || 'Unknown'}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
                    <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'var(--embr-bg)', border: '1px solid var(--embr-border)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginBottom: '0.25rem' }}>Budget Range</div>
                      <div style={{ fontWeight: '700', color: 'var(--embr-accent)' }}>${gig.budgetMin.toLocaleString()} – ${gig.budgetMax.toLocaleString()}</div>
                    </div>
                    {gig.estimatedDuration && (
                      <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'var(--embr-bg)', border: '1px solid var(--embr-border)' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} /> Timeline
                        </div>
                        <div style={{ fontWeight: '600' }}>{gig.estimatedDuration} day{gig.estimatedDuration !== 1 ? 's' : ''}</div>
                      </div>
                    )}
                    {gig.location && (
                      <div style={{ padding: '0.75rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'var(--embr-bg)', border: '1px solid var(--embr-border)' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={12} /> Location
                        </div>
                        <div style={{ fontWeight: '600' }}>{gig.location}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem' }}>About this gig</h3>
                    <p style={{ color: 'var(--embr-muted-text)', lineHeight: '1.6', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {gig.description}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="cover-letter" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Why are you interested? <span style={{ color: 'var(--embr-error)' }}>*</span>
                    </label>
                    <textarea
                      id="cover-letter"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={4}
                      placeholder={`Tell the creator about yourself and why you're interested in "${gig.title}"… (min 100 characters)`}
                      style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: coverLetter.length >= 100 ? 'var(--embr-muted-text)' : 'var(--embr-error)', textAlign: 'right', marginTop: '0.25rem' }}>
                      {coverLetter.length}/100 min
                    </div>
                  </div>
                  <div>
                    <label htmlFor="relevant-experience" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.375rem' }}>
                      Relevant Experience <span style={{ color: 'var(--embr-error)' }}>*</span>
                    </label>
                    <textarea
                      id="relevant-experience"
                      value={relevantExperience}
                      onChange={(e) => setRelevantExperience(e.target.value)}
                      rows={3}
                      placeholder="Describe your relevant skills and past work… (min 50 characters)"
                      style={{ width: '100%', padding: '0.625rem 0.75rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'var(--embr-bg)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: relevantExperience.length >= 50 ? 'var(--embr-muted-text)' : 'var(--embr-error)', textAlign: 'right', marginTop: '0.25rem' }}>
                      {relevantExperience.length}/50 min
                    </div>
                  </div>
                  {formError && (
                    <div style={{ padding: '0.625rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-error)', background: 'color-mix(in srgb, var(--embr-error) 10%, white)', color: 'var(--embr-error)', fontSize: '0.85rem' }}>
                      {formError}
                    </div>
                  )}
                </div>

                {/* Right: Booking Summary */}
                <div
                  className="ui-card"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--embr-accent) 8%, white)', border: '2px solid var(--embr-accent)' }}
                  data-padding="lg"
                >
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginBottom: '0.375rem' }}>Budget range</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--embr-accent)' }}>
                      ${gig.budgetMin.toLocaleString()}–${gig.budgetMax.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ padding: '0.875rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'color-mix(in srgb, var(--embr-sun) 12%, white)', border: '1px solid var(--embr-border)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <p style={{ margin: '0 0 0.375rem', fontWeight: '600' }}>🛡️ Protected Booking</p>
                    <p style={{ margin: 0, color: 'var(--embr-muted-text)' }}>
                      Your request goes to the creator who can accept or negotiate terms.
                    </p>
                  </div>

                  <Button onClick={handleBooking} disabled={bookingLoading} style={{ width: '100%' }}>
                    {bookingLoading ? 'Submitting...' : 'Send Booking Request'}
                  </Button>

                  <Link href={`/gigs/${gig.id}`} style={{ display: 'block', textAlign: 'center', fontSize: '0.8rem', color: 'var(--embr-muted-text)', textDecoration: 'none', marginTop: '0.75rem' }}>
                    View full gig details
                  </Link>
                </div>
              </div>
            </div>

            {/* Booking Process Timeline */}
            <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: '700' }}>
                How Booking Works
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {bookingSteps.map((stepItem, idx) => (
                  <div
                    key={stepItem.id}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--embr-radius-md)',
                      border: '1px solid var(--embr-border)',
                      backgroundColor: 'var(--embr-bg)',
                      position: 'relative',
                    }}
                  >
                    {idx < bookingSteps.length - 1 && (
                      <div style={{ position: 'absolute', top: '50%', right: '-1rem', width: '1rem', height: '2px', backgroundColor: 'var(--embr-border)', zIndex: -1 }} />
                    )}
                    <div style={{ marginBottom: '0.75rem', color: 'var(--embr-accent)' }}>{stepItem.icon}</div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: '600', margin: '0 0 0.375rem' }}>{stepItem.title}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)', margin: 0 }}>{stepItem.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Info */}
            <div className="ui-card" data-padding="lg" style={{ backgroundColor: 'color-mix(in srgb, var(--embr-warm-2) 10%, white)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <AlertCircle size={20} style={{ color: 'var(--embr-sun)', flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <p style={{ margin: '0 0 0.5rem', fontWeight: '600', fontSize: '0.9rem' }}>Good to know</p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--embr-muted-text)', fontSize: '0.85rem' }}>
                    <li style={{ marginBottom: '0.25rem' }}>Sending a booking request does not immediately commit payment</li>
                    <li style={{ marginBottom: '0.25rem' }}>The creator must accept your request before work begins</li>
                    <li style={{ marginBottom: '0.25rem' }}>You can negotiate budget and timeline in the messages</li>
                    <li>Payment is only processed after both parties agree on terms</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="ui-card" data-padding="lg" style={{ textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Booking Request Sent!
            </h2>
            <p style={{ color: 'var(--embr-muted-text)', marginBottom: '2rem' }}>
              Your request for <strong>{gig.title}</strong> has been submitted. The creator will review it and get back to you soon.
            </p>

            <div style={{ padding: '1.25rem', borderRadius: 'var(--embr-radius-md)', backgroundColor: 'var(--embr-bg)', border: '1px solid var(--embr-border)', marginBottom: '2rem', textAlign: 'left' }}>
              <h3 style={{ margin: '0 0 1rem', fontWeight: '600', fontSize: '0.95rem' }}>🔒 What Happens Next</h3>
              <div style={{ fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.875rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '50px' }}>Now</div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>Creator receives your booking request</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.875rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '50px' }}>Soon</div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>Creator accepts or proposes changes</div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--embr-accent)', minWidth: '50px' }}>Done</div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>Work begins once both parties confirm</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/gigs/bookings" style={{ flex: 1, minWidth: '150px' }}>
                <Button style={{ width: '100%' }}>View My Bookings</Button>
              </Link>
              <Link href="/gigs" style={{ flex: 1, minWidth: '150px' }}>
                <Button type="button" variant="secondary" style={{ width: '100%' }}>
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
