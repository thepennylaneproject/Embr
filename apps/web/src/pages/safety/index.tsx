import { useState } from 'react';
import { ProtectedPageShell } from '@/components/layout';
import { BlockedMutedList } from '@/components/safety/blocking/BlockedMutedList';
import { ReportModal } from '@/components/safety/reporting/ReportModal';
import { useSafety } from '@/hooks/useSafety';
import { ReportEntityType } from '@shared/types/safety.types';
import { Button, Input } from '@/components/ui';

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

  return (
    <ProtectedPageShell
      title="Safety Controls"
      subtitle="Manage your reports, blocked users, and muted users."
      breadcrumbs={[{ label: 'Safety' }]}
    >
      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          borderRadius: 'var(--embr-radius-md)',
          border: '1px solid var(--embr-error)',
          backgroundColor: 'color-mix(in srgb, var(--embr-error) 15%, white)',
          fontSize: '0.9rem',
          color: 'var(--embr-error)',
        }}>
          {error}
        </div>
      )}

      <div className="ui-card" data-padding="lg" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem', fontWeight: '600' }}>Quick Actions</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Block a user</h3>
            <Input
              id="block-user-id"
              placeholder="Enter user ID"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            />
            <Button
              type="button"
              onClick={() => blockUser({ userId: targetUserId })}
              disabled={!targetUserId || isSubmitting}
            >
              Block user
            </Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600' }}>Mute a user</h3>
            <Input
              id="mute-user-id"
              placeholder="Enter user ID"
              value={muteTargetUserId}
              onChange={(e) => setMuteTargetUserId(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <Input
                id="mute-duration"
                type="number"
                placeholder="Days (optional)"
                value={muteDuration}
                onChange={(e) => setMuteDuration(e.target.value ? Number(e.target.value) : '')}
                style={{ flex: 1 }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  muteUser({
                    userId: muteTargetUserId,
                    duration: muteDuration ? Number(muteDuration) : undefined,
                  })
                }
                disabled={!muteTargetUserId || isSubmitting}
              >
                Mute
              </Button>
            </div>
          </div>
        </div>

        <hr style={{ margin: '1rem 0', opacity: 0.3 }} />

        <h3 style={{ marginBottom: '0.75rem', fontWeight: '600' }}>Report Content</h3>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <select
            value={reportEntityType}
            onChange={(e) => setReportEntityType(e.target.value as ReportEntityType)}
            className="ui-field"
            style={{ flex: '0 1 150px' }}
          >
            {Object.values(ReportEntityType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Input
            id="report-entity-id"
            placeholder="Entity ID"
            value={reportEntityId}
            onChange={(e) => setReportEntityId(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setReportOpen(true)}
            disabled={!isReportReady}
          >
            Report
          </Button>
        </div>
      </div>

      <BlockedMutedList />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        entityType={reportEntityType}
        entityId={reportEntityId}
      />
    </ProtectedPageShell>
  );
}
