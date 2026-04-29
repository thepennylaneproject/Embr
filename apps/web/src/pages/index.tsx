import Link from 'next/link';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, PageState } from '@embr/ui';
import { copy } from '@/lib/copy';

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <>
      <Head>
        <title>{copy.brand.pageTitle(copy.brand.name)}</title>
      </Head>
      <main className="embr-page" style={{ display: 'grid', placeItems: 'center', padding: '1rem' }}>
        <Card padding="lg" style={{ width: 'min(740px, 100%)', textAlign: 'center' }}>
          <h1 className="ui-page-title">{copy.brand.homeTitle}</h1>
          <p className="ui-page-subtitle">{copy.brand.homeDescription}</p>

          {loading ? (
            <PageState title={copy.onboarding.loading} description={copy.onboarding.loadingDesc} />
          ) : null}

          {!loading && isAuthenticated ? (
            <PageState title={copy.onboarding.welcomeBack} description={copy.onboarding.welcomeBackDesc} />
          ) : null}

          {!loading && !isAuthenticated ? (
            <PageState
              title={copy.onboarding.signInToContinue}
              description={copy.onboarding.signInToContinueDesc}
            />
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {!loading && isAuthenticated ? (
              <Link href="/feed">
                <Button type="button">{copy.actions.goToFeed}</Button>
              </Link>
            ) : null}
            {!loading && !isAuthenticated ? (
              <>
                <Link href="/auth/login">
                  <Button type="button">{copy.onboarding.signIn}</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button type="button" variant="secondary">
                    {copy.onboarding.createAccount}
                  </Button>
                </Link>
              </>
            ) : null}
          </div>
        </Card>
      </main>
    </>
  );
}
