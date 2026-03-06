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

interface ErrorPageProps {
  statusCode: number | null;
}

function ErrorPage({ statusCode }: ErrorPageProps) {
  const title =
    statusCode === 404
      ? 'Page Not Found'
      : statusCode === 500
        ? 'Internal Server Error'
        : 'An Error Occurred';

  const message =
    statusCode === 404
      ? "The page you're looking for doesn't exist."
      : "Something went wrong on our end. We've been notified and are looking into it.";

  return (
    <>
      <Head>
        <title>{`${statusCode ?? 'Error'} – Embr`}</title>
      </Head>
      <div
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
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            {statusCode === 404 ? '🔍' : '⚠️'}
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
          <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '16px' }}>
            {message}
          </p>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              marginTop: '10px',
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
            Go Home
          </button>
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
