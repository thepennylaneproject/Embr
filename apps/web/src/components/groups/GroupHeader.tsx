import React from 'react';
import Link from 'next/link';
import type { Group, GroupMemberRole } from '@embr/types';

interface GroupHeaderProps {
  group: Group;
  onJoin?: () => void;
  onLeave?: () => void;
  actionLoading?: boolean;
  currentUserId?: string;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  onJoin,
  onLeave,
  actionLoading,
  currentUserId,
}) => {
  const isMember = !!group.membershipRole;
  const isAdmin = group.membershipRole === 'ADMIN';
  const isModerator = group.membershipRole === 'MODERATOR';
  const isCreator = group.createdById === currentUserId;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Banner */}
      <div style={{
        height: '160px',
        borderRadius: 'var(--embr-radius-lg)',
        background: group.coverUrl
          ? `url(${group.coverUrl}) center/cover no-repeat`
          : 'linear-gradient(135deg, var(--embr-warm-1) 0%, var(--embr-warm-2) 100%)',
        marginBottom: '1rem',
        position: 'relative',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Avatar */}
        {group.avatarUrl && (
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            border: '3px solid var(--embr-surface)',
            background: `url(${group.avatarUrl}) center/cover`,
            flexShrink: 0,
            marginTop: '-36px',
          }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '800', color: 'var(--embr-text)' }}>
                {group.name}
                {group.isVerified && (
                  <span title="Verified" style={{ marginLeft: '0.4rem', color: 'var(--embr-accent)' }}>✓</span>
                )}
              </h1>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--embr-muted-text)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                <span>{group.memberCount.toLocaleString()} members</span>
                {group.category && <span>{group.category}</span>}
                <span style={{ textTransform: 'capitalize' }}>{group.type.toLowerCase()} group</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {!isCreator && (
                isMember ? (
                  <button
                    onClick={onLeave}
                    disabled={actionLoading}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: 'var(--embr-radius-md)',
                      border: '1px solid var(--embr-border)',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                    }}
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    onClick={onJoin}
                    disabled={actionLoading}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: 'var(--embr-radius-md)',
                      border: 'none',
                      background: 'var(--embr-accent)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                    }}
                  >
                    {group.type === 'PUBLIC' ? 'Join Group' : 'Request to Join'}
                  </button>
                )
              )}

              {(isAdmin || isCreator) && (
                <Link href={`/groups/${group.slug}/settings`}>
                  <button style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: '1px solid var(--embr-border)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                  }}>
                    Settings
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Description */}
          {group.description && (
            <p style={{ margin: '0.75rem 0 0', color: 'var(--embr-muted-text)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              {group.description}
            </p>
          )}

          {/* Tags */}
          {group.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {group.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: '0.78rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'var(--embr-bg)',
                  color: 'var(--embr-muted-text)',
                  border: '1px solid var(--embr-border)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
