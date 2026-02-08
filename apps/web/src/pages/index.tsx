import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, PageState } from '@/components/ui';

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <main className="embr-page" style={{ display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <Card padding="lg" style={{ width: 'min(740px, 100%)', textAlign: 'center' }}>
        <h1 className="ui-page-title">Embr Frontend</h1>
        <p className="ui-page-subtitle">
          Cohesive UI foundation is active. Social, messaging, monetization, and safety slices are staged next.
        </p>

        {loading ? <PageState title="Loading" description="Checking your authentication state." /> : null}

        {!loading && isAuthenticated ? (
          <PageState title="Welcome back" description="Continue to your feed." />
        ) : null}

        {!loading && !isAuthenticated ? (
          <PageState title="Sign in to continue" description="Create an account or sign in to access Embr." />
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {!loading && isAuthenticated ? (
            <Link href="/feed">
              <Button type="button">Go to feed</Button>
            </Link>
          ) : null}
          {!loading && !isAuthenticated ? (
            <>
              <Link href="/auth/login">
                <Button type="button">Sign in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button type="button" variant="secondary">
                  Create account
                </Button>
              </Link>
            </>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
