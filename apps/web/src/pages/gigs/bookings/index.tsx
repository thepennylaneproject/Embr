import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedPageShell } from '@/components/layout';
import { applicationsApi } from '@shared/api/gigs.api';
import { PageState } from '@/components/ui/PageState';
import type { Application, ApplicationStatus } from '@embr/types';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  PENDING: '#f59e0b',
  ACCEPTED: '#22c55e',
  REJECTED: '#ef4444',
  WITHDRAWN: '#6b7280',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: 'Under Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export default function GigBookingsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await applicationsApi.getMyApplications();
      setApplications(result.applications);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleWithdraw = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this booking request?')) return;
    setWithdrawingId(applicationId);
    try {
      await applicationsApi.withdraw(applicationId);
      await load();
    } catch {
      // silently refresh
      await load();
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <ProtectedPageShell
      title="My Bookings"
      breadcrumbs={[{ label: 'Gigs', href: '/gigs' }, { label: 'My Bookings' }]}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>My Booking Requests</h1>
          <Link href="/gigs">
            <button style={{ padding: '0.5rem 1rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
              ← Browse Gigs
            </button>
          </Link>
        </div>

        {loading ? (
          <PageState type="loading" title="Loading bookings..." />
        ) : error ? (
          <PageState type="empty" title="Couldn't load bookings" description={error} />
        ) : applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--embr-surface)', border: '1px solid var(--embr-border)', borderRadius: 'var(--embr-radius-lg)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', margin: '0 0 0.5rem' }}>No booking requests yet</h2>
            <p style={{ color: 'var(--embr-muted-text)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Browse gigs and send booking requests to get started.
            </p>
            <Link href="/gigs">
              <button style={{ padding: '0.625rem 1.5rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '700' }}>
                Browse Gigs
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {applications.map((app) => {
              const statusColor = STATUS_COLORS[app.status] || '#6b7280';
              const statusLabel = STATUS_LABELS[app.status] || app.status;
              return (
                <div
                  key={app.id}
                  style={{
                    background: 'var(--embr-surface)',
                    border: '1px solid var(--embr-border)',
                    borderRadius: 'var(--embr-radius-lg)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div style={{ padding: '0.875rem 1rem', background: 'var(--embr-bg)', borderBottom: '1px solid var(--embr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <Link href={`/gigs/${app.gigId}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--embr-text)' }}>
                          {app.gig?.title || `Gig Request`}
                        </div>
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)', marginTop: '0.15rem' }}>
                        Submitted {new Date(app.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.625rem', borderRadius: '999px', background: `${statusColor}22`, color: statusColor, flexShrink: 0 }}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)', marginBottom: '0.2rem' }}>Proposed Budget</div>
                      <div style={{ fontWeight: '700', color: 'var(--embr-accent)' }}>${app.proposedBudget.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)', marginBottom: '0.2rem' }}>Timeline</div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{app.proposedTimeline} day{app.proposedTimeline !== 1 ? 's' : ''}</div>
                    </div>
                    {app.coverLetter && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--embr-muted-text)', marginBottom: '0.2rem' }}>Your Message</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--embr-text)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {app.coverLetter}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status-specific messaging */}
                  {app.status === 'ACCEPTED' && (
                    <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', fontSize: '0.85rem', color: '#16a34a', fontWeight: '600' }}>
                      ✓ Your booking was accepted! The creator will reach out to finalize details.
                    </div>
                  )}
                  {app.status === 'REJECTED' && (
                    <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderTop: '1px solid #fecaca', fontSize: '0.85rem', color: '#dc2626' }}>
                      This booking request was not accepted.{' '}
                      <Link href="/gigs" style={{ color: '#dc2626', fontWeight: '600' }}>Browse other gigs →</Link>
                    </div>
                  )}

                  {/* Actions */}
                  {app.status === 'PENDING' && (
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--embr-border)', display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/gigs/${app.gigId}`}>
                        <button style={{ padding: '0.35rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                          View Gig
                        </button>
                      </Link>
                      <button
                        onClick={() => handleWithdraw(app.id)}
                        disabled={withdrawingId === app.id}
                        style={{ padding: '0.35rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-error)', background: 'transparent', color: 'var(--embr-error)', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem', opacity: withdrawingId === app.id ? 0.7 : 1 }}
                      >
                        {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw Request'}
                      </button>
                    </div>
                  )}
                  {(app.status === 'ACCEPTED' || app.status === 'REJECTED') && (
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--embr-border)' }}>
                      <Link href={`/gigs/${app.gigId}`}>
                        <button style={{ padding: '0.35rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: '1px solid var(--embr-border)', background: 'transparent', cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem' }}>
                          View Gig
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedPageShell>
  );
}
