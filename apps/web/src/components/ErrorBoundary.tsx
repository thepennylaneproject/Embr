/**
 * Error Boundary
 *
 * Catches React component render errors and displays a fallback UI, preventing
 * an unhandled crash from taking down the entire page.
 *
 * Usage — root boundary (app shell, full-page fallback):
 *   <ErrorBoundary><App /></ErrorBoundary>
 *
 * Usage — sub-tree boundary (feature-level, inline fallback):
 *   <ErrorBoundary fallback={({ error, reset }) => <InlineErrorCard onReset={reset} />}>
 *     <FeatureWidget />
 *   </ErrorBoundary>
 *
 * Usage — HOC:
 *   const SafeFeed = withErrorBoundary(Feed);
 *   const SafeFeed = withErrorBoundary(Feed, { fallback: <p>Feed unavailable.</p> });
 *
 * Route-based reset:
 *   Use `key={router.pathname}` on the boundary to automatically reset when the
 *   user navigates to a different page. See _app.tsx for the canonical pattern.
 */

import React, { ComponentType, ReactNode } from 'react';

// Evaluated once at module load to avoid a secondary ReferenceError in browser
// environments where `process` may be absent (e.g. certain Vite builds).
const isDevelopment =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FallbackProps {
  /** The error that was caught. */
  error: Error;
  /** React's component stack at the time of the error. */
  errorInfo: React.ErrorInfo | null;
  /** Call this to clear the error state and re-render children. */
  reset: () => void;
}

/** A render function that receives error context and returns custom fallback UI. */
export type FallbackRender = (props: FallbackProps) => ReactNode;

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Custom fallback UI.
   *  - Omit → default full-page error card (inline styles, always safe).
   *  - ReactNode → rendered as-is.
   *  - FallbackRender → called with `{ error, errorInfo, reset }`.
   */
  fallback?: ReactNode | FallbackRender;
  /**
   * Called whenever an error is caught. Use this to report to Sentry, Datadog,
   * or any other error-tracking sink.
   *
   * When NEXT_PUBLIC_SENTRY_DSN is configured:
   *   onError={(err, info) => Sentry.captureException(err, { extra: info })}
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Called after the boundary successfully resets (either programmatically or via the default UI). */
  onReset?: () => void;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ---------------------------------------------------------------------------
// Default error reporter (console; swap for Sentry when configured)
// ---------------------------------------------------------------------------

function reportError(error: Error, extra?: Record<string, unknown>): void {
  console.error('[ErrorBoundary] Unhandled render error:', error, extra);
}

// ---------------------------------------------------------------------------
// Default fallback UI
// Uses inline styles throughout — CSS may be unavailable when the tree crashes.
// ---------------------------------------------------------------------------

function DefaultFallback({
  error,
  errorInfo,
  onReset,
}: {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
}) {
  return (
    <div
      role="alert"
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
          ⚠️
        </div>
        <h1 style={{ margin: '0 0 10px 0', color: '#1a1a1a', fontSize: '24px' }}>
          Oops! Something went wrong
        </h1>
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '16px' }}>
          We&apos;re sorry, but something unexpected happened. Please try refreshing the
          page or navigating home.
        </p>

        {isDevelopment && error && (
          <details
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f0f0f0',
              borderRadius: '6px',
              textAlign: 'left',
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
              Error details (development only)
            </summary>
            <pre
              style={{
                margin: '0',
                overflow: 'auto',
                fontSize: '12px',
                color: '#d32f2f',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.toString()}
              {errorInfo && '\n\n' + errorInfo.componentStack}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px' }}>
          <button
            onClick={onReset}
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
            Try Again
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
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
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ErrorBoundary — class component (required for getDerivedStateFromError)
// ---------------------------------------------------------------------------

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.reset = this.reset.bind(this);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    reportError(error, { componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  /** Programmatically reset the boundary (re-render children). */
  public reset(): void {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  }

  public render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { fallback, children } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return (fallback as FallbackRender)({ error, errorInfo, reset: this.reset });
      }
      if (fallback !== undefined && fallback !== null) {
        return fallback;
      }
      return (
        <DefaultFallback error={error} errorInfo={errorInfo} onReset={this.reset} />
      );
    }

    return children;
  }
}

// ---------------------------------------------------------------------------
// withErrorBoundary HOC
// ---------------------------------------------------------------------------

/**
 * Higher-order component that wraps `Component` in an `ErrorBoundary`.
 *
 * @example
 * const SafeFeed = withErrorBoundary(Feed);
 * const SafeFeed = withErrorBoundary(Feed, {
 *   fallback: ({ reset }) => <button onClick={reset}>Reload feed</button>,
 * });
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, 'children'>,
): ComponentType<P> {
  const displayName = Component.displayName || Component.name || 'Component';

  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;
  return WrappedComponent;
}
