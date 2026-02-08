import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { Button, Card, PageState } from '@/components/ui';

type PlaceholderState = 'loading' | 'empty' | 'error';

interface FeaturePlaceholderProps {
  title: string;
  subtitle: string;
  issueId: string;
  issuePath?: string;
  accent?: 'warm1' | 'warm2' | 'sun' | 'seaGlass';
}

export function FeaturePlaceholder({
  title,
  subtitle,
  issueId,
  issuePath = '/Users/sarahsahl/Desktop/embr/.docs/frontend-roadmap.md',
  accent,
}: FeaturePlaceholderProps) {
  const [state, setState] = useState<PlaceholderState>('loading');

  const stateContent = {
    loading: {
      title: 'Loading state',
      description: `${title} data is loading. TODO: ${issueId}`,
    },
    empty: {
      title: 'Empty state',
      description: `No ${title.toLowerCase()} data yet. TODO: ${issueId}`,
    },
    error: {
      title: 'Error state',
      description: `Request failed. Retry behavior will be implemented in ${issueId}.`,
    },
  }[state];

  return (
    <ProtectedRoute>
      <AppShell title={title} subtitle={subtitle} accent={accent}>
        <Card padding="lg">
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button type="button" variant={state === 'loading' ? 'primary' : 'secondary'} onClick={() => setState('loading')}>
              Loading
            </Button>
            <Button type="button" variant={state === 'empty' ? 'primary' : 'secondary'} onClick={() => setState('empty')}>
              Empty
            </Button>
            <Button type="button" variant={state === 'error' ? 'primary' : 'secondary'} onClick={() => setState('error')}>
              Error
            </Button>
          </div>

          <PageState title={stateContent.title} description={stateContent.description} />

          <p className="ui-help-text" style={{ textAlign: 'center' }}>
            Tracking note: <code>{issuePath}</code>
          </p>
        </Card>
      </AppShell>
    </ProtectedRoute>
  );
}
