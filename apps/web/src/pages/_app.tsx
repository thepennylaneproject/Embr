import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@embr/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateEnv } from '@/lib/env';
import '../styles/globals.css';

// Validate environment variables on first server render.
// next.config.js already validates at process startup; this call is a
// belt-and-suspenders guard for SSR environments where next.config.js
// validation may have been bypassed (e.g. custom server wrappers).
validateEnv();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <title>Embr</title>
      </Head>
      <AuthProvider>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
