import { PropsWithChildren, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, PageState } from '@embr/ui';

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
      // Small delay so any in-flight navigation from AuthContext.login can settle first
      const t = setTimeout(() => router.replace(redirectTo), 50);
      return () => clearTimeout(t);
    }

    if (!requireAuth && user) {
      const t = setTimeout(() => router.replace('/feed'), 50);
      return () => clearTimeout(t);
    }

    return;
  }, [loading, redirectAuthenticated, redirectTo, requireAuth, router, user]);

  if (loading) {
    return (
      <Card padding="lg" style={{ marginTop: '2rem' }}>
        <PageState title="Loading session" description="Checking your account details." />
      </Card>
    );
  }

  if (requireAuth && !user) {
    return (
      <Card padding="lg" style={{ marginTop: '2rem' }}>
        <PageState title="Redirecting" description="You need to sign in to view this page." />
      </Card>
    );
  }

  if (!requireAuth && user && redirectAuthenticated) {
    return (
      <Card padding="lg" style={{ marginTop: '2rem' }}>
        <PageState title="Redirecting" description="You are already signed in." />
      </Card>
    );
  }

  return <>{children}</>;
}
