import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </AuthProvider>
  );
}
