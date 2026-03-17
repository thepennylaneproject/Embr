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
        <title>{copy.brand.pageTitle('Getting Started')}</title>
      </Head>
      <ProtectedPageShell
        title="Getting Started"
        subtitle="Complete these steps to get the most out of Embr."
        breadcrumbs={[{ label: 'Getting Started' }]}
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
              Want to restart the getting-started checklist?
            </p>
            <Button variant="ghost" onClick={resetOnboarding} style={{ fontSize: '0.85rem' }}>
              Reset onboarding progress
            </Button>
          </div>
        </div>
      </ProtectedPageShell>
    </>
  );
}
