import type { AppProps } from 'next/app';
import Head from 'next/head';
import { AuthProvider } from '@/contexts/AuthContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ToastProvider } from '@embr/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OnboardingWizard } from '@/components/onboarding';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <title>Embr</title>
      </Head>
      <AuthProvider>
        <ToastProvider>
          <OnboardingProvider>
            <Component {...pageProps} />
            {/* Global onboarding wizard — renders as a portal over any page */}
            <OnboardingWizard />
          </OnboardingProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
