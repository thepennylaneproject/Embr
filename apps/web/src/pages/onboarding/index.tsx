/**
 * /onboarding — Dedicated onboarding page.
 * Shows the CreatorOnboarding checklist and lets users reset/revisit their wizard.
 * Protected route (requires auth).
 */
import Head from 'next/head';
import { ProtectedPageShell } from '@/components/layout';
import { CreatorOnboarding } from '@/components/onboarding';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { copy } from '@/lib/copy';
import { Button } from '@embr/ui';

export default function OnboardingPage() {
  const { user } = useAuth();
  const { resetOnboarding } = useOnboarding();

  if (!user) return null;

  return (
    <>
      <Head>
        <title>{copy.brand.pageTitle(copy.gettingStartedPage.title)}</title>
      </Head>
      <ProtectedPageShell
        title={copy.gettingStartedPage.title}
        subtitle={copy.gettingStartedPage.subtitle}
        breadcrumbs={[{ label: copy.gettingStartedPage.title }]}
      >
        <div style={{ maxWidth: '640px' }}>
          <CreatorOnboarding userId={user.id} />

          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--embr-border)',
            }}
          >
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--embr-muted-text)',
                marginBottom: '0.75rem',
              }}
            >
              {copy.gettingStartedPage.resetPrompt}
            </p>
            <Button variant="ghost" onClick={resetOnboarding} style={{ fontSize: '0.85rem' }}>
              {copy.gettingStartedPage.resetButton}
            </Button>
          </div>
        </div>
      </ProtectedPageShell>
    </>
  );
}
