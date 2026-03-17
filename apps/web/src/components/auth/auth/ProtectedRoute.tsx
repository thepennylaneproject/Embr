import { PropsWithChildren, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, PageState } from '@embr/ui';
import { copy } from '@/lib/copy';

interface ProtectedRouteProps {
  requireAuth?: boolean;
  redirectTo?: string;
  redirectAuthenticated?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/auth/login',
  redirectAuthenticated = true,
}: PropsWithChildren<ProtectedRouteProps>) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !router.isReady) {
      return undefined;
    }

    if (requireAuth && !user) {
      let cancelled = false;
      router.replace(redirectTo).catch((e) => {
        if (!cancelled && e?.cancelled !== true) console.error('Redirect failed:', e);
      });
      return () => { cancelled = true; };
    }

    if (!requireAuth && user) {
      let cancelled = false;
      router.replace('/feed').catch((e) => {
        if (!cancelled && e?.cancelled !== true) console.error('Redirect failed:', e);
      });
      return () => { cancelled = true; };
    }

    return;
  }, [loading, redirectAuthenticated, redirectTo, requireAuth, router, user]);

  if (loading) {
    return (
      <Card padding="lg" style={{ marginTop: '2rem' }}>
        <PageState
          title={copy.onboarding.loadingSession}
          description={copy.onboarding.checkingAccountDetails}
        />
      </Card>
    );
  }

  if (requireAuth && !user) {
    return (
      <Card padding="lg" style={{ marginTop: '2rem' }}>
        <PageState
          title={copy.onboarding.redirecting}
          description={copy.onboarding.signInToView}
        />
      </Card>
    );
  }

  if (!requireAuth && user && redirectAuthenticated) {
    return (
      <Card padding="lg" style={{ marginTop: '2rem' }}>
        <PageState title={copy.onboarding.redirecting} description={copy.onboarding.alreadySignedIn} />
      </Card>
    );
  }

  return <>{children}</>;
}
