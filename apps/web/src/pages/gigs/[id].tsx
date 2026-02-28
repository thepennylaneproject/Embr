import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ProtectedPageShell } from '@/components/layout';
import { ApplicationForm } from '@/components/gigs/ApplicationForm';
import { TipButton } from '@/components/monetization/TipButton';
import { useAuth } from '@/contexts/AuthContext';
import { useGig } from '@/hooks/useGig';
import { GigBudgetType, GigStatus } from '@shared/types/gig.types';
import { Button } from '@embr/ui';

export default function GigDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { gig, loading, error, fetchGig } = useGig();
  const [showApply, setShowApply] = useState(false);

  const gigId = useMemo(() => {
    if (typeof router.query.id !== 'string') return '';
    return router.query.id;
  }, [router.query.id]);

  useEffect(() => {
    if (!gigId) return;
    fetchGig(gigId);
  }, [gigId, fetchGig]);

  if (loading || !gigId) {
    return (
      <ProtectedPageShell breadcrumbs={[{ label: 'Gigs', href: '/gigs' }, { label: 'Gig' }]}>
        <p style={{ color: 'var(--embr-muted-text)' }}>Loading gig...</p>
      </ProtectedPageShell>
    );
  }

  if (error || !gig) {
    return (
      <ProtectedPageShell breadcrumbs={[{ label: 'Gigs', href: '/gigs' }, { label: 'Gig' }]}>
        <p style={{ color: 'var(--embr-error)' }}>{error || 'Gig not found.'}</p>
        <Link href="/gigs">
          <Button type="button" variant="secondary" style={{ marginTop: '0.5rem' }}>
            Back to gigs
          </Button>
        </Link>
      </ProtectedPageShell>
    );
  }

  const budgetLabel = gig.budgetType === GigBudgetType.HOURLY
    ? 'Hourly'
    : gig.budgetType === GigBudgetType.MILESTONE
    ? 'Milestone'
    : 'Fixed';

  const isOwner = user?.id === gig.creatorId;
  const canApply = gig.status === GigStatus.OPEN && !isOwner;

  return (
    <ProtectedPageShell
      title={gig.title}
      subtitle={`${gig.category.replace('_', ' ')} · ${budgetLabel}`}
      breadcrumbs={[{ label: 'Gigs', href: '/gigs' }, { label: 'Gig' }]}
    >
      <div className="ui-card" data-padding="lg">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{gig.title}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {gig.category.replace('_', ' ')} · {budgetLabel}
                </p>
                <p className="mt-4 text-gray-700 whitespace-pre-wrap">{gig.description}</p>
              </div>
              <div className="md:text-right">
                <p className="text-sm text-gray-500">Budget</p>
                <p className="text-2xl font-semibold text-[#E8998D]">
                  ${gig.budgetMin.toLocaleString()} - ${gig.budgetMax.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{gig.currency}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">Experience</p>
                <p>{gig.experienceLevel.replace('_', ' ')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">Duration</p>
                <p>{gig.estimatedDuration} days</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">Applications</p>
                <p>{gig.applicationsCount}</p>
              </div>
            </div>

            {gig.skills.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {gig.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {canApply && (
                <button
                  onClick={() => setShowApply((prev) => !prev)}
                  className="px-6 py-2.5 bg-[#E8998D] text-white rounded-lg font-medium hover:bg-[#d88a7e]"
                >
                  {showApply ? 'Hide application' : 'Apply now'}
                </button>
              )}
              {isOwner && (
                <span className="text-sm text-gray-500">
                  You&apos;re the creator of this gig.
                </span>
              )}
              {gig.creator && !isOwner && (
                <TipButton
                  recipientId={gig.creator.id}
                  recipientName={gig.creator.displayName}
                  variant="button"
                  size="sm"
                />
              )}
            </div>
          </div>

          {showApply && (
            <div className="mt-6">
              <ApplicationForm
                gig={gig}
                onSuccess={() => {
                  setShowApply(false);
                  fetchGig(gig.id);
                }}
                onCancel={() => setShowApply(false)}
              />
            </div>
          )}
    </ProtectedPageShell>
  );
}
