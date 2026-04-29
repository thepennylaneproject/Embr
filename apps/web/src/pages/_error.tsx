/**
 * Next.js Global Error Page (_error.tsx)
 *
 * Handles errors that fall outside the React component tree:
 *  - Server-side rendering failures
 *  - getServerSideProps / getStaticProps exceptions
 *  - Next.js API route crashes that reach the error handler
 *
 * This complements the client-side <ErrorBoundary> in _app.tsx.
 */

import type { NextPageContext } from 'next';
import Head from 'next/head';
import { copy } from '@/lib/copy';

interface ErrorPageProps {
  statusCode: number | null;
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  const is404 = statusCode === 404;

  const title = is404
    ? copy.errors.pageNotFoundTitle
    : statusCode === 500
      ? copy.errors.serverErrorTitle
      : copy.errors.genericErrorTitle;

  const message = is404
    ? copy.errors.pageNotFoundDesc
    : statusCode != null && statusCode >= 500
      ? copy.errors.serverErrorDesc
      : copy.errors.genericErrorDesc;

  return (
    <>
      <Head>
        <title>{`${statusCode ?? 'Error'} – ${copy.brand.name}`}</title>
      </Head>
      <div
        role="main"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '600px',
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }} aria-hidden="true">
            {is404 ? '🔍' : '⚠️'}
          </div>
          {statusCode && (
            <p
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#FF6B35',
                margin: '0 0 10px 0',
                lineHeight: 1,
              }}
            >
              {statusCode}
            </p>
          )}
          <h1 style={{ margin: '0 0 10px 0', color: '#1a1a1a', fontSize: '24px' }}>
            {title}
          </h1>
          <p style={{ margin: '0 0 24px 0', color: '#666', fontSize: '16px' }}>
            {message}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {is404 ? (
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#FF6B35',
                  border: '2px solid #FF6B35',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {copy.errors.goBack}
              </button>
            ) : (
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#FF6B35',
                  border: '2px solid #FF6B35',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {copy.errors.tryAgain}
              </button>
            )}
            {/* Use window.location.href instead of Next.js router — the router
                context may not be available when the server/SSR pipeline has
                already crashed and rendered this page. */}
            <button
              onClick={() => { window.location.href = '/'; }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              {copy.errors.goHome}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext): ErrorPageProps => {
  if (res) {
    return { statusCode: res.statusCode };
  }
  if (err) {
    const errWithStatus = err as Error & { statusCode?: number };
    return { statusCode: errWithStatus.statusCode ?? 500 };
  }
  return { statusCode: 404 };
};

export default ErrorPage;
