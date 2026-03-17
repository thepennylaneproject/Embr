import React from 'react';
import type { EventAttendee } from '@embr/types';

interface AttendeeListProps {
  attendees: EventAttendee[];
  totalCount?: number;
}

export function AttendeeList({ attendees, totalCount }: AttendeeListProps) {
  return (
    <div>
      <h3 style={{ fontWeight: '700', fontSize: '0.95rem', margin: '0 0 0.75rem' }}>
        Attendees {totalCount !== undefined ? `(${totalCount})` : ''}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
        {attendees.map((a) => (
          <div key={a.id} title={a.user?.profile?.displayName || a.user?.username} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', width: '52px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--embr-border)', overflow: 'hidden', flexShrink: 0 }}>
              {a.user?.profile?.avatarUrl ? (
                <img src={a.user.profile.avatarUrl} alt={a.user?.profile?.displayName || a.user?.username || 'Attendee'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.875rem', color: 'var(--embr-muted-text)' }}>
                  {(a.user?.profile?.displayName || a.user?.username || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--embr-muted-text)', textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.2 }}>
              {a.user?.profile?.displayName?.split(' ')[0] || a.user?.username?.slice(0, 8)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
