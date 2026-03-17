import Link from 'next/link';
import { useRouter } from 'next/router';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { copy } from '@/lib/copy';

interface AuthShellProps {
  /**
   * Explicit "back" destination. When omitted the component uses
   * `router.back()` if there is a browser-history entry, otherwise it
   * falls back to `fallbackHref`.
   */
  backHref?: string;
  /** Fallback href used when there is no browser-history entry and
   *  `backHref` is not provided. Defaults to '/'. */
  fallbackHref?: string;
  /** When true the back-navigation control is hidden. */
  hideBack?: boolean;
}

/**
 * Minimal layout wrapper for authentication pages.
 *
 * Adds:
 *  - A sticky brand header that always provides a clickable escape route back
 *    to the home page ('/').
 *  - A smart "back" navigation link: navigates to `backHref` when supplied,
 *    otherwise uses router.back() if history depth > 0, or falls back to '/'.
 *  - A centred content area for the auth card.
 */
export default function AuthShell({
  children,
  backHref,
  fallbackHref = '/',
  hideBack = false,
}: PropsWithChildren<AuthShellProps>) {
  const router = useRouter();
  // Track whether there is a previous entry in the browser's session history
  // so we can decide between router.back() and a static link.
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    // history.length === 1 means this tab was opened directly to this page.
    setHasPreviousPage(window.history.length > 1);
  }, []);

  const handleBack = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!backHref && hasPreviousPage) {
      event.preventDefault();
      router.back();
    }
    // Otherwise let the <Link> navigate to backHref / fallbackHref normally.
  };

  const resolvedBackHref = backHref ?? fallbackHref;

  return (
    <div className="embr-auth-shell">
      <header className="embr-auth-header">
        <div className="embr-container embr-auth-header-row">
          {/* Brand — always links to home as the primary escape route */}
          <Link href="/" className="embr-brand" aria-label={copy.brand.ariaLabel}>
            <span className="embr-brand-dot" aria-hidden="true" />
            <span className="embr-brand-text-auth">Embr</span>
          </Link>

          {!hideBack && (
            <Link
              href={resolvedBackHref}
              onClick={handleBack}
              className="embr-auth-back-link"
              aria-label="Go back"
            >
              <span className="embr-auth-back-arrow" aria-hidden="true">←</span>
              <span>{copy.actions.back}</span>
            </Link>
          )}
        </div>
      </header>

      <main
        className="embr-auth-content"
        style={{ display: 'grid', placeItems: 'center', padding: '1.5rem 1rem 3rem' }}
      >
        {children}
      </main>
    </div>
  );
}
