import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@embr/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </Head>
      <AuthProvider>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
