import { useMemo, useState } from 'react';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { BlockedMutedList } from '@/components/safety/blocking/BlockedMutedList';
import { ReportModal } from '@/components/safety/reporting/ReportModal';
import { useSafety } from '@/hooks/useSafety';
import { ReportEntityType } from '@shared/types/safety.types';

export default function SafetyPage() {
  const { blockUser, muteUser, isSubmitting, error } = useSafety();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportEntityType, setReportEntityType] = useState<ReportEntityType>(
    ReportEntityType.POST,
  );
  const [reportEntityId, setReportEntityId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [muteTargetUserId, setMuteTargetUserId] = useState('');
  const [muteDuration, setMuteDuration] = useState<number | ''>('');

  const isReportReady = reportEntityId.trim().length > 0;

  const muteExpiresAt = useMemo(() => {
    if (!muteDuration || Number.isNaN(Number(muteDuration))) return undefined;
    const date = new Date();
    date.setDate(date.getDate() + Number(muteDuration));
    return date.toISOString();
  }, [muteDuration]);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-gray-900">Safety controls</h1>
            <p className="text-sm text-gray-500">
              Manage your reports, blocked users, and muted users.
            </p>
          </header>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Block a user</h3>
                <input
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8998D] focus:outline-none"
                />
                <button
                  onClick={() => blockUser({ userId: targetUserId })}
                  disabled={!targetUserId || isSubmitting}
                  className="px-4 py-2 rounded-full bg-[#E8998D] text-white text-sm font-medium hover:bg-[#d88a7e] disabled:opacity-50"
                >
                  Block user
                </button>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Mute a user</h3>
                <input
                  value={muteTargetUserId}
                  onChange={(e) => setMuteTargetUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8998D] focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={muteDuration}
                    onChange={(e) => setMuteDuration(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Days"
                    className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8998D] focus:outline-none"
                  />
                  <span className="text-xs text-gray-500">Optional duration</span>
                </div>
                <button
                  onClick={() =>
                    muteUser({
                      userId: muteTargetUserId,
                      expiresAt: muteExpiresAt,
                    })
                  }
                  disabled={!muteTargetUserId || isSubmitting}
                  className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  Mute user
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Report content</h3>
              <div className="flex flex-wrap gap-3">
                <select
                  value={reportEntityType}
                  onChange={(e) => setReportEntityType(e.target.value as ReportEntityType)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {Object.values(ReportEntityType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  value={reportEntityId}
                  onChange={(e) => setReportEntityId(e.target.value)}
                  placeholder="Entity ID"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8998D] focus:outline-none"
                />
                <button
                  onClick={() => setReportOpen(true)}
                  disabled={!isReportReady}
                  className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  Open report modal
                </button>
              </div>
            </div>
          </section>

          <BlockedMutedList />
        </div>
      </main>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        entityType={reportEntityType}
        entityId={reportEntityId}
      />
    </ProtectedRoute>
  );
}
