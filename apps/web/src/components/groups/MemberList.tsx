import React from 'react';
import Link from 'next/link';
import type { GroupMember, GroupMemberRole } from '@embr/types';

interface MemberListProps {
  members: GroupMember[];
  currentUserId?: string;
  currentUserRole?: GroupMemberRole | null;
  onRemove?: (userId: string) => void;
  onUpdateRole?: (userId: string, role: GroupMemberRole) => void;
}

const ROLE_BADGE: Record<GroupMemberRole, { label: string; color: string }> = {
  ADMIN: { label: 'Admin', color: '#ef4444' },
  MODERATOR: { label: 'Mod', color: '#f59e0b' },
  MEMBER: { label: 'Member', color: '#6b7280' },
};

export const MemberList: React.FC<MemberListProps> = ({
  members,
  currentUserId,
  currentUserRole,
  onRemove,
  onUpdateRole: _onUpdateRole,
}) => {
  const canManage = currentUserRole === 'ADMIN' || currentUserRole === 'MODERATOR';
  const roleOrder = { ADMIN: 2, MODERATOR: 1, MEMBER: 0 };
  const currentRoleOrder = currentUserRole ? roleOrder[currentUserRole] : -1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {members.map((member) => {
        const badge = ROLE_BADGE[member.role];
        const memberRoleOrder = roleOrder[member.role];
        const canActOnMember = canManage && member.userId !== currentUserId && memberRoleOrder < currentRoleOrder;

        return (
          <div key={member.id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem',
            borderRadius: 'var(--embr-radius-md)',
            background: 'var(--embr-bg)',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              {member.user?.profile?.avatarUrl ? (
                <img
                  src={member.user.profile.avatarUrl}
                  alt={member.user?.profile?.displayName || member.user?.username || 'Member'}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--embr-warm-1)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '0.875rem', flexShrink: 0,
                }}>
                  {(member.user?.profile?.displayName || member.user?.username || '?')[0].toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <Link href={`/${member.user?.username}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--embr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.user?.profile?.displayName || member.user?.username}
                  </div>
                </Link>
                <div style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
                  @{member.user?.username}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '600',
                padding: '0.2rem 0.5rem',
                borderRadius: '999px',
                background: `${badge.color}22`,
                color: badge.color,
              }}>
                {badge.label}
              </span>

              {canActOnMember && onRemove && (
                <button
                  onClick={() => onRemove(member.userId)}
                  title="Remove member"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    padding: '0.2rem 0.4rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
