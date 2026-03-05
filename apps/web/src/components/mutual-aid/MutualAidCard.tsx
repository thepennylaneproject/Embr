import React from 'react';
import Link from 'next/link';
import type { MutualAidPost } from '@embr/types';
import { MUTUAL_AID_CATEGORY_ICONS, MUTUAL_AID_CATEGORY_LABELS } from '@embr/types';
import { UrgencyBadge } from './UrgencyBadge';

interface MutualAidCardProps {
  post: MutualAidPost;
  onRespond?: (postId: string) => void;
  currentUserId?: string;
}

const TYPE_CONFIG = {
  REQUEST: { label: 'Needs Help', color: '#7c3aed', bg: '#f5f3ff' },
  OFFER: { label: 'Offering', color: '#0891b2', bg: '#ecfeff' },
};

const STATUS_INDICATORS: Record<string, { dot: string }> = {
  OPEN: { dot: '#22c55e' },
  IN_PROGRESS: { dot: '#f59e0b' },
  FULFILLED: { dot: '#6b7280' },
  CANCELLED: { dot: '#6b7280' },
  EXPIRED: { dot: '#6b7280' },
};

export const MutualAidCard: React.FC<MutualAidCardProps> = ({ post, onRespond, currentUserId }) => {
  const typeConfig = TYPE_CONFIG[post.type];
  const statusDot = STATUS_INDICATORS[post.status]?.dot || '#6b7280';
  const isAuthor = post.authorId === currentUserId;
  const isActive = post.status === 'OPEN' || post.status === 'IN_PROGRESS';

  return (
    <div style={{
      background: 'var(--embr-surface)',
      border: '1px solid var(--embr-border)',
      borderRadius: 'var(--embr-radius-lg)',
      padding: '1.125rem',
      transition: 'box-shadow 0.15s ease',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '999px', background: typeConfig.bg, color: typeConfig.color }}>
            {typeConfig.label}
          </span>
          <span style={{ fontSize: '1rem' }} title={MUTUAL_AID_CATEGORY_LABELS[post.category]}>
            {MUTUAL_AID_CATEGORY_ICONS[post.category]}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--embr-muted-text)' }}>
            {MUTUAL_AID_CATEGORY_LABELS[post.category]}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <UrgencyBadge urgency={post.urgency} />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusDot, display: 'inline-block' }} title={post.status} />
        </div>
      </div>

      {/* Title */}
      <Link href={`/mutual-aid/${post.id}`} style={{ textDecoration: 'none' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: '700', color: 'var(--embr-text)', lineHeight: 1.35, cursor: 'pointer' }}>
          {post.title}
        </h3>
      </Link>

      {/* Description */}
      <p style={{
        margin: '0 0 0.75rem',
        fontSize: '0.875rem',
        color: 'var(--embr-muted-text)',
        lineHeight: 1.55,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {post.description}
      </p>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--embr-muted-text)', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
        {post.quantity && <span>📦 {post.quantity}</span>}
        {post.location && <span>📍 {post.location}</span>}
        {post.isRemote && <span>🌐 Remote</span>}
        <span>{post._count?.responses ?? post.responseCount} {post.responseCount === 1 ? 'response' : 'responses'}</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Author */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
            background: post.author?.profile?.avatarUrl ? `url(${post.author.profile.avatarUrl}) center/cover` : 'var(--embr-warm-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: '700',
          }}>
            {!post.author?.profile?.avatarUrl && (post.author?.profile?.displayName || post.author?.username || '?')[0].toUpperCase()}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)' }}>
            {post.author?.profile?.displayName || post.author?.username}
          </span>
        </div>

        {!isAuthor && isActive && onRespond && (
          <button
            onClick={() => onRespond(post.id)}
            style={{ padding: '0.375rem 0.875rem', borderRadius: 'var(--embr-radius-md)', border: 'none', background: 'var(--embr-accent)', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem' }}
          >
            Respond
          </button>
        )}

        {isAuthor && post.status === 'IN_PROGRESS' && (
          <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: '600' }}>In Progress</span>
        )}
      </div>
    </div>
  );
};
