import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

interface PageStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function PageState({ title, description, actionLabel, onAction, icon }: PageStateProps) {
  return (
    <section className="ui-page-state">
      {icon ? <div style={{ marginBottom: '0.75rem' }}>{icon}</div> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {actionLabel && onAction ? (
        <div style={{ marginTop: '1rem' }}>
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
