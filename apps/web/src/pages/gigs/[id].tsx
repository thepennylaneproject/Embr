import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { ApplicationForm } from '@/components/gigs/ApplicationForm';
import { TipButton } from '@/components/monetization/TipButton';
import { useAuth } from '@/contexts/AuthContext';
import { useGig } from '@/hooks/useGig';
import { GigBudgetType, GigStatus } from '@shared/types/gig.types';

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
      <ProtectedRoute>
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <p className="text-gray-600">Loading gig...</p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (error || !gig) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <p className="text-red-600">{error || 'Gig not found.'}</p>
            <Link href="/gigs" className="text-[#E8998D] hover:underline">
              Back to gigs
            </Link>
          </div>
        </main>
      </ProtectedRoute>
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
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/gigs" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to gigs
          </Link>

          <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-6">
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
        </div>
      </main>
    </ProtectedRoute>
  );
}
