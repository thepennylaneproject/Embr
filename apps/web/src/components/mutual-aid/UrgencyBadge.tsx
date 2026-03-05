import React from 'react';
import type { MutualAidUrgency } from '@embr/types';

const URGENCY_CONFIG: Record<MutualAidUrgency, { label: string; color: string; bg: string }> = {
  LOW: { label: 'Low', color: '#6b7280', bg: '#f3f4f6' },
  MEDIUM: { label: 'Medium', color: '#d97706', bg: '#fffbeb' },
  HIGH: { label: 'High', color: '#ea580c', bg: '#fff7ed' },
  CRITICAL: { label: 'Critical', color: '#dc2626', bg: '#fef2f2' },
};

interface UrgencyBadgeProps {
  urgency: MutualAidUrgency;
  size?: 'sm' | 'md';
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency, size = 'sm' }) => {
  const config = URGENCY_CONFIG[urgency];
  return (
    <span style={{
      fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
      fontWeight: '700',
      padding: size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.625rem',
      borderRadius: '999px',
      background: config.bg,
      color: config.color,
      border: `1px solid ${config.color}44`,
      letterSpacing: '0.02em',
    }}>
      {config.label === 'Critical' ? '🚨 ' : ''}{config.label}
    </span>
  );
};
