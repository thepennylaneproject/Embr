import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@embr/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    /**
     * Root ErrorBoundary — catches catastrophic failures in the provider tree
     * itself (AuthProvider, ToastProvider). Uses the default full-page fallback.
     * Not keyed on the route; intentionally stable across navigation.
     */
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <title>Embr</title>
      </Head>
      <AuthProvider>
        <ToastProvider>
          {/*
           * Page-level ErrorBoundary — keyed on the current pathname so it
           * automatically resets (unmounts + remounts) whenever the user
           * navigates to a different route. A crash on /feed will not persist
           * when the user navigates to /messages.
           *
           * The inline fallback lets the error be surfaced within the app
           * without blowing away the provider context above it.
           */}
          <ErrorBoundary
            key={router.pathname}
            fallback={({ error, reset }) => (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60vh',
                  padding: '40px 20px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '16px' }} aria-hidden="true">
                  ⚠️
                </div>
                <h2 style={{ margin: '0 0 8px', color: '#1a1a1a', fontSize: '20px' }}>
                  This page encountered an error
                </h2>
                <p style={{ margin: '0 0 24px', color: '#666', fontSize: '15px', maxWidth: '400px' }}>
                  {error.message || 'An unexpected error occurred. Try again or navigate to another page.'}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={reset}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#FF6B35',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                    }}
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => { window.location.href = '/feed'; }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'transparent',
                      color: '#FF6B35',
                      border: '2px solid #FF6B35',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: '600',
                    }}
                  >
                    Go to Feed
                  </button>
                </div>
              </div>
            )}
          >
            <Component {...pageProps} />
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
