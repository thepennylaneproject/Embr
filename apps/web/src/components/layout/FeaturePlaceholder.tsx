import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import ProtectedRoute from '@/components/auth/auth/ProtectedRoute';
import { Button, Card, PageState } from '@embr/ui';

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
  issuePath = '.docs/frontend-roadmap.md',
  accent,
}: FeaturePlaceholderProps) {
  const [state, setState] = useState<PlaceholderState>('empty');

  const stateContent = {
    loading: {
      title: 'Loading',
      description: `${title} is loading. Please wait.`,
    },
    empty: {
      title: 'Nothing here yet',
      description: `No ${title.toLowerCase()} to show right now. Check back soon.`,
    },
    error: {
      title: 'Something went wrong',
      description: `We couldn't load ${title.toLowerCase()}. Please try again.`,
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
        </Card>
      </AppShell>
    </ProtectedRoute>
  );
}
