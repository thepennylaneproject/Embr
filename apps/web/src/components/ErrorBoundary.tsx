/**
 * Error Boundary
 * Catches React component errors and displays a fallback UI
 * Prevents entire app from crashing on unhandled errors
 */

import React, { ReactNode, ReactElement } from 'react';

// Evaluated once at module load. Guards against environments (e.g. Vite browser
// builds) where `process` is not defined at runtime, which would throw a
// secondary ReferenceError inside the error boundary's own render path.
const isDevelopment =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Report an error to an external sink.
 * When NEXT_PUBLIC_SENTRY_DSN is configured and @sentry/nextjs is installed
 * this function should call `Sentry.captureException(error, { extra: { componentStack } })`.
 * Without Sentry the error is surfaced via console.error so it appears in log
 * aggregators (Vercel logs, CloudWatch, etc.) and is not silently swallowed.
 */
function reportError(error: Error, extra?: Record<string, unknown>): void {
  console.error('[ErrorBoundary] Unhandled render error:', error, extra);
}

export class ErrorBoundary extends React.Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    reportError(error, { componentStack: errorInfo.componentStack });
  }

  public render(): ReactElement {
    if (this.state.hasError) {
      return (
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
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ margin: '0 0 10px 0', color: '#1a1a1a', fontSize: '24px' }}>
              Oops! Something went wrong
            </h1>
            <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '16px' }}>
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>

            {isDevelopment && this.state.error && (
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
                  {this.state.error.toString()}
                  {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
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
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as ReactElement;
  }
}
