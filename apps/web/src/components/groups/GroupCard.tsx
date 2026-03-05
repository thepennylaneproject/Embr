import React from 'react';
import Link from 'next/link';
import type { Group } from '@embr/types';

interface GroupCardProps {
  group: Group;
  onJoin?: (groupId: string) => void;
  joinLoading?: boolean;
  currentUserId?: string;
  joinState?: 'idle' | 'requested';
}

const GROUP_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  PUBLIC: { label: 'Public', color: '#22c55e' },
  PRIVATE: { label: 'Private', color: '#f59e0b' },
  SECRET: { label: 'Secret', color: '#6b7280' },
};

export const GroupCard: React.FC<GroupCardProps> = ({ group, onJoin, joinLoading, currentUserId, joinState = 'idle' }) => {
  const badge = GROUP_TYPE_BADGE[group.type];
  const isMember = !!group.membershipRole;
  const isCreator = group.createdById === currentUserId;
  const isRequested = joinState === 'requested';

  return (
    <div style={{
      background: 'var(--embr-surface)',
      border: '1px solid var(--embr-border)',
      borderRadius: 'var(--embr-radius-lg)',
      overflow: 'hidden',
      transition: 'box-shadow 0.15s ease',
    }}>
      {/* Cover image */}
      <div style={{
        height: '100px',
        background: group.coverUrl
          ? `url(${group.coverUrl}) center/cover`
          : 'linear-gradient(135deg, var(--embr-warm-1), var(--embr-warm-2))',
        position: 'relative',
      }}>
        {/* Avatar */}
        {group.avatarUrl && (
          <div style={{
            position: 'absolute',
            bottom: '-20px',
            left: '16px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '3px solid var(--embr-surface)',
            background: `url(${group.avatarUrl}) center/cover`,
          }} />
        )}
      </div>

      <div style={{ padding: '1.25rem', paddingTop: group.avatarUrl ? '1.75rem' : '1rem' }}>
        {/* Name + type badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <Link href={`/groups/${group.slug}`} style={{ textDecoration: 'none' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--embr-text)', lineHeight: 1.3 }}>
              {group.name}
            </h3>
          </Link>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '600',
            padding: '0.2rem 0.5rem',
            borderRadius: '999px',
            background: `${badge.color}22`,
            color: badge.color,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {badge.label}
          </span>
        </div>

        {/* Description */}
        {group.description && (
          <p style={{
            margin: '0 0 0.75rem',
            fontSize: '0.85rem',
            color: 'var(--embr-muted-text)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {group.description}
          </p>
        )}

        {/* Category + member count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          {group.category && (
            <span style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
              {group.category}
            </span>
          )}
          <span style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
            {group.memberCount.toLocaleString()} {group.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Tags */}
        {group.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
            {group.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{
                fontSize: '0.72rem',
                padding: '0.15rem 0.5rem',
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

        {/* CTA */}
        {!isCreator && onJoin && (
          <button
            onClick={() => onJoin(group.id)}
            disabled={joinLoading || isMember || isRequested}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: 'var(--embr-radius-md)',
              border: (isMember || isRequested) ? '1px solid var(--embr-border)' : 'none',
              background: (isMember || isRequested) ? 'transparent' : 'var(--embr-accent)',
              color: (isMember || isRequested) ? 'var(--embr-muted-text)' : '#fff',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: (isMember || isRequested) ? 'default' : 'pointer',
              opacity: joinLoading ? 0.6 : 1,
            }}
          >
            {isMember ? 'Member' : isRequested ? 'Request Pending' : group.type === 'PUBLIC' ? 'Join' : 'Request to Join'}
          </button>
        )}
      </div>
    </div>
  );
};
