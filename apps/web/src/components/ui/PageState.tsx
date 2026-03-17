import type { ReactNode } from 'react';
import { Button } from '@embr/ui';

interface PageStateProps {
  type?: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  isLoading?: boolean;
  hint?: string;
}

export function PageState({
  type = 'empty',
  title,
  description,
  actionLabel,
  onAction,
  icon,
  isLoading = false,
  hint,
}: PageStateProps) {
  const defaultDescription =
    description ||
    (type === 'loading'
      ? 'This can take a few seconds.'
      : type === 'error'
        ? 'Something went wrong. Please try refreshing the page.'
        : undefined);

  return (
    <section className="ui-page-state" role={isLoading ? 'status' : undefined} aria-busy={isLoading}>
      {icon ? (
        <div style={{ marginBottom: '0.75rem', opacity: isLoading ? 0.7 : 1 }}>
          {icon}
        </div>
      ) : null}
      <h3>{title}</h3>
      {defaultDescription ? <p>{defaultDescription}</p> : null}
      {isLoading && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
          Please wait...
        </p>
      )}
      {hint ? (
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--embr-muted-text)' }}>
          {hint}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <div style={{ marginTop: '1rem' }}>
          <Button
            type="button"
            onClick={onAction}
            disabled={isLoading}
            loading={isLoading}
          >
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
