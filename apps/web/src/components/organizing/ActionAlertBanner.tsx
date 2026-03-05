import React from 'react';
import type { ActionAlert } from '@embr/types';
import { ALERT_URGENCY_COLORS } from '@embr/types';

interface ActionAlertBannerProps {
  alert: ActionAlert;
  onDeactivate?: (id: string) => void;
  canManage?: boolean;
}

export function ActionAlertBanner({ alert, onDeactivate, canManage }: ActionAlertBannerProps) {
  const color = ALERT_URGENCY_COLORS[alert.urgency];

  return (
    <div
      style={{
        padding: '0.875rem 1rem',
        borderRadius: 'var(--embr-radius-md)',
        borderLeft: `4px solid ${color}`,
        background: `${color}12`,
        marginBottom: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color }}>
              {alert.urgency === 'CRITICAL' ? '🚨' : alert.urgency === 'URGENT' ? '⚠️' : '📢'} {alert.urgency}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--embr-muted-text)' }}>
              {new Date(alert.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p style={{ margin: '0 0 0.25rem', fontWeight: '700', fontSize: '0.95rem' }}>{alert.title}</p>
          <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--embr-text)' }}>{alert.body}</p>
          {alert.ctaText && alert.ctaUrl && (
            <a
              href={alert.ctaUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-block', marginTop: '0.5rem', fontWeight: '700', fontSize: '0.82rem', color, textDecoration: 'none' }}
            >
              {alert.ctaText} →
            </a>
          )}
        </div>
        {canManage && onDeactivate && (
          <button
            onClick={() => onDeactivate(alert.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--embr-muted-text)', flexShrink: 0, padding: '0.25rem' }}
            title="Dismiss alert"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
