import { PropsWithChildren, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Card, PageState } from '@/components/ui';

interface ProtectedRouteProps {
  requireAuth?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/auth/login',
}: PropsWithChildren<ProtectedRouteProps>) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (requireAuth && !user) {
      router.replace(redirectTo);
      return;
    }

    if (!requireAuth && user) {
      router.replace('/feed');
    }
  }, [loading, redirectTo, requireAuth, router, user]);

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

  if (!requireAuth && user) {
    return (
      <Card padding="lg" style={{ marginTop: '2rem' }}>
        <PageState title="Redirecting" description="You are already signed in." />
      </Card>
    );
  }

  return <>{children}</>;
}
