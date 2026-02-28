import type { ReactNode } from 'react';
import { Button } from './Button';

interface PageStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  isLoading?: boolean;
}

export function PageState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  isLoading = false,
}: PageStateProps) {
  return (
    <section className="ui-page-state" role={isLoading ? 'status' : undefined} aria-busy={isLoading}>
      {icon ? (
        <div style={{ marginBottom: '0.75rem', opacity: isLoading ? 0.7 : 1 }}>
          {icon}
        </div>
      ) : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {isLoading && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontStyle: 'italic' }}>
          Please wait...
        </p>
      )}
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
