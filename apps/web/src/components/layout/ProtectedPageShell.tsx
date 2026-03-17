'use client';

import { PropsWithChildren, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell, type AppShellProps } from './AppShell';
import { Card, PageState } from '@embr/ui';
import { copy } from '@/lib/copy';

interface ProtectedPageShellProps extends AppShellProps {
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * ProtectedPageShell
 *
 * Combines authentication protection with the AppShell layout.
 * Use this for pages that require authentication and need consistent layout.
 *
 * @example
 * export default function MyPage() {
 *   return (
 *     <ProtectedPageShell
 *       title="My Page"
 *       subtitle="Description of the page"
 *       breadcrumbs={[{ label: 'Home', href: '/feed' }, { label: 'My Page' }]}
 *     >
 *       <YourContent />
 *     </ProtectedPageShell>
 *   );
 * }
 */
export function ProtectedPageShell({
  children,
  requireAuth = true,
  redirectTo = '/auth/login',
  title,
  subtitle,
  breadcrumbs,
  accent = 'warm1',
}: PropsWithChildren<ProtectedPageShellProps>) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !router.isReady) {
      return undefined;
    }

    if (requireAuth && !user) {
      let cancelled = false;
      router
        .replace(redirectTo)
        .catch((error) => {
          if (!cancelled && error?.cancelled !== true) {
            console.error('Failed to redirect to sign in:', error);
          }
        });
      return () => { cancelled = true; };
    }
    return undefined;
  }, [loading, redirectTo, requireAuth, router, user]);

  if (loading) {
    return (
      <AppShell title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} accent={accent}>
        <Card padding="lg">
          <PageState
            title={copy.onboarding.loadingSession}
            description={copy.onboarding.checkingAccountDetails}
          />
        </Card>
      </AppShell>
    );
  }

  if (requireAuth && !user) {
    return (
      <AppShell title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} accent={accent}>
        <Card padding="lg">
          <PageState
            title={copy.onboarding.redirecting}
            description={copy.onboarding.redirectingToSignInDesc}
          />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} accent={accent}>
      {children}
    </AppShell>
  );
}

export default ProtectedPageShell;
