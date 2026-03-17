import Link from 'next/link';
import { PropsWithChildren } from 'react';
import { copy } from '@/lib/copy';

interface AuthShellProps {
  /**
   * Destination for the "← Back" control in the header.
   * Defaults to '/' (the home page) when omitted.
   */
  backHref?: string;
  /** When true the back-navigation control is hidden. */
  hideBack?: boolean;
}

/**
 * Minimal layout wrapper for authentication pages.
 *
 * Provides:
 *  - A sticky brand header with a predictable escape route.
 *  - The Embr logo always links to '/' (home) — primary escape route.
 *  - A "← Back" link that navigates to `backHref` (defaults to '/').
 *  - A centred content area for the auth card.
 */
export default function AuthShell({
  children,
  backHref = '/',
  hideBack = false,
}: PropsWithChildren<AuthShellProps>) {
  return (
    <div className="embr-auth-shell">
      <header className="embr-auth-header">
        <div className="embr-container embr-auth-header-row">
          {/* Brand — always an escape route to the home page */}
          <Link href="/" className="embr-brand" aria-label={copy.brand.ariaLabel}>
            <span className="embr-brand-dot" aria-hidden="true" />
            <span className="embr-brand-text-auth">Embr</span>
          </Link>

          {!hideBack && (
            <Link href={backHref} className="embr-auth-back-link" aria-label="Go back">
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
