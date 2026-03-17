import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { ApplicationForm } from '@/components/gigs/ApplicationForm';
import { Button } from '@embr/ui';
import { Calendar, Clock, AlertCircle, CheckCircle, Shield, DollarSign } from 'lucide-react';
import { gigsApi } from '@shared/api/gigs.api';
import { GigWithDetails, GigBudgetType, GigStatus } from '@embr/types';
import { useAuth } from '@/contexts/AuthContext';

/** Normalize creator display name across PublicProfile and full User API responses */
function getCreatorDisplayName(creator: any): string {
  return creator?.displayName || creator?.profile?.displayName || creator?.fullName || creator?.username || 'Creator';
}

function getCreatorUsername(creator: any): string {
  return creator?.username || creator?.profile?.username || '';
}

export default function GigBookingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { gigId } = router.query;

  const [gig, setGig] = useState<GigWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'details' | 'apply' | 'success'>('details');
  const [_applicationId, setApplicationId] = useState<string>('');

  useEffect(() => {
    if (!gigId || typeof gigId !== 'string') return;

    const fetchGig = async () => {
      try {
        const data = await gigsApi.getById(gigId);
        setGig(data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to load gig');
      } finally {
        setLoading(false);
      }
    };

    fetchGig();
  }, [gigId]);

  const budgetLabel = gig
    ? gig.budgetType === GigBudgetType.HOURLY
      ? 'Hourly'
      : gig.budgetType === GigBudgetType.MILESTONE
      ? 'Milestone-based'
      : 'Fixed price'
    : '';

  const isOwner = user?.id === gig?.creatorId;
  const canApply = gig?.status === GigStatus.OPEN && !isOwner;

  const bookingSteps = [
    {
      id: 'apply',
      title: 'Submit Application',
      description: 'Describe your approach and proposed budget',
      icon: <Shield size={24} />,
    },
    {
      id: 'review',
      title: 'Creator Reviews',
      description: 'The gig creator reviews your application',
      icon: <Clock size={24} />,
    },
    {
      id: 'accepted',
      title: 'Get Accepted',
      description: 'Creator accepts and funds are held in escrow',
      icon: <CheckCircle size={24} />,
    },
    {
      id: 'deliver',
      title: 'Deliver & Get Paid',
      description: 'Complete the work; funds are released to you',
      icon: <Calendar size={24} />,
    },
  ];

  if (loading) {
    return (
      <ProtectedPageShell
        title="Apply to Gig"
        breadcrumbs={[
          { label: 'Gigs', href: '/gigs' },
          { label: 'Apply' },
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
        title="Apply to Gig"
        breadcrumbs={[
          { label: 'Gigs', href: '/gigs' },
          { label: 'Apply' },
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

  return (
    <ProtectedPageShell
      title={step === 'success' ? 'Application Submitted' : `Apply to: ${gig.title}`}
      breadcrumbs={[
        { label: 'Gigs', href: '/gigs' },
        { label: gig.title, href: `/gigs/${gig.id}` },
        { label: step === 'success' ? 'Applied' : 'Apply' },
      ]}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Details + Apply form */}
        {step !== 'success' && (
          <>
            {/* Gig Info Card */}
            <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '2rem',
                  alignItems: 'start',
                }}
              >
                {/* Left: Gig Details */}
                <div>
                  <h1
                    style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '1.8rem',
                      fontWeight: '700',
                    }}
                  >
                    {gig.title}
                  </h1>

                  {gig.creator && (
                    <p
                      style={{
                        margin: '0 0 1.5rem 0',
                        color: 'var(--embr-muted-text)',
                        fontSize: '1rem',
                      }}
                    >
                      Posted by{' '}
                      <Link href={`/${getCreatorUsername(gig.creator)}`}>
                        <span
                          style={{
                            color: 'var(--embr-accent)',
                            fontWeight: '600',
                          }}
                        >
                          {getCreatorDisplayName(gig.creator)}
                        </span>
                      </Link>
                    </p>
                  )}

                  <div style={{ marginBottom: '2rem' }}>
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                      }}
                    >
                      About this gig
                    </h3>
                    <p
                      style={{
                        color: 'var(--embr-text)',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {gig.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                      gap: '1rem',
                      marginBottom: gig.skills.length > 0 ? '1.5rem' : '0',
                    }}
                  >
                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--embr-radius-md)',
                        backgroundColor: 'var(--embr-bg)',
                        border: '1px solid var(--embr-border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--embr-muted-text)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Duration
                      </div>
                      <div
                        style={{
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <Clock size={18} />
                        {gig.estimatedDuration}{' '}
                        {gig.estimatedDuration === 1 ? 'day' : 'days'}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--embr-radius-md)',
                        backgroundColor: 'var(--embr-bg)',
                        border: '1px solid var(--embr-border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--embr-muted-text)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Category
                      </div>
                      <div style={{ fontWeight: '600' }}>
                        {gig.category.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--embr-radius-md)',
                        backgroundColor: 'var(--embr-bg)',
                        border: '1px solid var(--embr-border)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--embr-muted-text)',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Experience
                      </div>
                      <div style={{ fontWeight: '600' }}>
                        {gig.experienceLevel.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>

                  {gig.skills.length > 0 && (
                    <div>
                      <h3
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          marginBottom: '0.5rem',
                          color: 'var(--embr-muted-text)',
                        }}
                      >
                        Required skills
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {gig.skills.map((skill) => (
                          <span
                            key={skill}
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.85rem',
                              backgroundColor: 'var(--embr-bg)',
                              border: '1px solid var(--embr-border)',
                            }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Budget Summary */}
                <div
                  className="ui-card"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--embr-accent) 8%, white)',
                    border: '2px solid var(--embr-accent)',
                    minWidth: '200px',
                  }}
                  data-padding="lg"
                >
                  <div style={{ marginBottom: '1rem' }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--embr-muted-text)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Budget ({budgetLabel})
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: 'var(--embr-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <DollarSign size={20} />
                      {gig.budgetMin === gig.budgetMax
                        ? gig.budgetMin.toLocaleString()
                        : `${gig.budgetMin.toLocaleString()} – ${gig.budgetMax.toLocaleString()}`}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--embr-muted-text)',
                      }}
                    >
                      {gig.currency}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--embr-muted-text)',
                      marginBottom: '1rem',
                    }}
                  >
                    <span style={{ fontWeight: '600', color: 'var(--embr-text)' }}>
                      {gig.applicationsCount}
                    </span>{' '}
                    {gig.applicationsCount === 1 ? 'application' : 'applications'} so far
                  </div>

                  {isOwner ? (
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--embr-muted-text)',
                        margin: 0,
                      }}
                    >
                      You own this gig.
                    </p>
                  ) : canApply ? (
                    <Button
                      onClick={() => setStep('apply')}
                      style={{ width: '100%' }}
                    >
                      Apply Now
                    </Button>
                  ) : (
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--embr-muted-text)',
                        margin: 0,
                      }}
                    >
                      This gig is no longer accepting applications.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Inline application form */}
            {step === 'apply' && canApply && (
              <div style={{ marginBottom: '2rem' }}>
                <ApplicationForm
                  gig={gig}
                  onSuccess={(id) => {
                    setApplicationId(id);
                    setStep('success');
                  }}
                  onCancel={() => setStep('details')}
                />
              </div>
            )}

            {/* How It Works Timeline */}
            {step === 'details' && (
              <>
                <div className="ui-card" data-padding="lg" style={{ marginBottom: '2rem' }}>
                  <h2
                    style={{
                      margin: '0 0 1.5rem 0',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                    }}
                  >
                    How It Works
                  </h2>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '1rem',
                    }}
                  >
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
                        <div
                          style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--embr-accent)',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {idx + 1}
                        </div>

                        <div
                          style={{ marginBottom: '1rem', color: 'var(--embr-accent)' }}
                        >
                          {stepItem.icon}
                        </div>
                        <h3
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            margin: '0 0 0.5rem 0',
                          }}
                        >
                          {stepItem.title}
                        </h3>
                        <p
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--embr-muted-text)',
                            margin: 0,
                          }}
                        >
                          {stepItem.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Protection Note */}
                <div
                  className="ui-card"
                  data-padding="lg"
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--embr-warm-2) 10%, white)',
                    marginBottom: '2rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <AlertCircle
                      size={20}
                      style={{ color: 'var(--embr-sun)', flexShrink: 0 }}
                    />
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: '600',
                          marginBottom: '0.5rem',
                        }}
                      >
                        Escrow Protection
                      </p>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.5rem',
                          color: 'var(--embr-muted-text)',
                          fontSize: '0.9rem',
                        }}
                      >
                        <li style={{ marginBottom: '0.25rem' }}>
                          Funds are held in escrow until work is delivered
                        </li>
                        <li style={{ marginBottom: '0.25rem' }}>
                          You can raise a dispute if the deliverables aren't met
                        </li>
                        <li style={{ marginBottom: '0.25rem' }}>
                          Milestone payments keep projects on track
                        </li>
                        <li>No hidden fees</li>
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
                      style={{ width: '100%' }}
                    >
                      Browse Other Gigs
                    </Button>
                  </Link>
                  {canApply && (
                    <div style={{ flex: 1 }}>
                      <Button
                        onClick={() => setStep('apply')}
                        style={{ width: '100%' }}
                      >
                        Apply Now
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="ui-card" data-padding="lg" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
              }}
            >
              Application Submitted!
            </h2>
            <p
              style={{
                color: 'var(--embr-muted-text)',
                marginBottom: '2rem',
              }}
            >
              You've applied to{' '}
              <strong>{gig.title}</strong>
              {gig.creator && (
                <>
                  {' '}posted by{' '}
                  <strong>{getCreatorDisplayName(gig.creator)}</strong>
                </>
              )}
              . You'll be notified when the creator reviews your application.
            </p>

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
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      fontWeight: '600',
                      color: 'var(--embr-accent)',
                      minWidth: '70px',
                    }}
                  >
                    Now
                  </div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>
                    Your application is under review
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      fontWeight: '600',
                      color: 'var(--embr-accent)',
                      minWidth: '70px',
                    }}
                  >
                    If accepted
                  </div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>
                    Funds move to escrow and work begins
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div
                    style={{
                      fontWeight: '600',
                      color: 'var(--embr-accent)',
                      minWidth: '70px',
                    }}
                  >
                    On delivery
                  </div>
                  <div style={{ color: 'var(--embr-muted-text)' }}>
                    Escrow is released to you when deliverables are approved
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <Link href="/gigs/manage" style={{ flex: 1, minWidth: '150px' }}>
                <Button style={{ width: '100%' }}>View My Applications</Button>
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
