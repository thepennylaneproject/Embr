import { useEffect } from 'react';
import { useRouter } from 'next/router';

interface UseUnsavedChangesGuardOptions {
  enabled: boolean;
  message?: string;
}

export function useUnsavedChangesGuard({
  enabled,
  message = 'You have unsaved changes. Leave this page?',
}: UseUnsavedChangesGuardOptions) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handleRouteChangeStart = (nextUrl: string) => {
      if (nextUrl === router.asPath) {
        return;
      }

      const shouldLeave = window.confirm(message);
      if (shouldLeave) {
        return;
      }

      router.events.emit('routeChangeError');
      const abortError = new Error('Route change aborted: unsaved changes');
      (abortError as Error & { cancelled?: boolean }).cancelled = true;
      throw abortError;
    };

    router.beforePopState(() => window.confirm(message));
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.beforePopState(() => true);
    };
  }, [enabled, message, router]);
}

