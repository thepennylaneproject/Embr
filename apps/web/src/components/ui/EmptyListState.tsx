import type { ReactNode } from 'react';

export interface EmptyListStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Tighter padding for sidebars (e.g. conversation list). */
  compact?: boolean;
  /** No card chrome — for nested panels. */
  plain?: boolean;
}

/**
 * Shared empty list layout — use with copy from `copy.emptyStates` for consistent tone.
 */
export function EmptyListState({
  title,
  description,
  icon,
  children,
  className = '',
  compact = false,
  plain = false,
}: EmptyListStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={className}
      style={{
        textAlign: 'center',
        padding: compact ? '1.25rem 0.75rem' : '3rem 1.5rem',
        ...(plain
          ? {}
          : {
              background: 'var(--embr-surface)',
              border: '1px solid var(--embr-border)',
              borderRadius: 'var(--embr-radius-lg)',
            }),
        color: 'var(--embr-muted-text)',
      }}
    >
      {icon != null ? (
        <div
          style={{
            fontSize: compact ? '1.75rem' : '2.5rem',
            marginBottom: compact ? '0.35rem' : '0.75rem',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <h2
        style={{
          margin: 0,
          fontSize: compact ? '0.9rem' : '1.125rem',
          fontWeight: 700,
          color: 'var(--embr-text)',
        }}
      >
        {title}
      </h2>
      {description ? (
        <p
          style={{
            margin: compact ? '0.35rem auto 0' : '0.5rem auto 1rem',
            fontSize: compact ? '0.8rem' : '0.9rem',
            maxWidth: '28rem',
            lineHeight: 1.45,
          }}
        >
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
