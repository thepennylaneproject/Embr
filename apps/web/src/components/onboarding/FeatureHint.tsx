/**
 * FeatureHint
 * A dismissible hint banner shown once per page to explain what the feature does.
 * Uses OnboardingContext to track which pages have been visited.
 * Stops appearing after the user has seen it (localStorage-backed).
 *
 * Implementation note: we use local state to capture "first visit" on mount
 * (before the context marks the page as visited) to avoid an immediate
 * disappear due to state updates in the same render cycle.
 */
import React, { useEffect, useRef } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureHintProps {
  pageId: string;
  icon?: string;
  title: string;
  description: string;
}

export function FeatureHint({ pageId, icon, title, description }: FeatureHintProps) {
  const { user } = useAuth();
  const { loaded, isPageVisited, markPageVisited } = useOnboarding();
  const [visible, setVisible] = React.useState(false);
  // Prevent the effect from running multiple times in React StrictMode
  const hasRun = useRef(false);

  useEffect(() => {
    if (!loaded || !user || hasRun.current) return;
    hasRun.current = true;

    if (!isPageVisited(pageId)) {
      // Show the hint now, and mark the page as visited so it won't appear again on next visit
      setVisible(true);
      markPageVisited(pageId);
    }
    // Intentionally not depending on isPageVisited/markPageVisited to capture one-time check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user]);

  if (!visible) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.875rem',
        padding: '1rem 1.25rem',
        borderRadius: 'var(--embr-radius-md)',
        border: '1.5px solid var(--embr-secondary-200, #b8d4d0)',
        background: 'var(--embr-secondary-50, #f0f7f6)',
        marginBottom: '1.25rem',
        position: 'relative',
      }}
      role="note"
      aria-label={`Feature hint: ${title}`}
    >
      {icon && (
        <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
          {icon}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'var(--embr-text)',
            margin: '0 0 0.2rem',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--embr-muted-text)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss hint"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--embr-muted-text)',
          fontSize: '0.9rem',
          lineHeight: 1,
          padding: '0.25rem',
          borderRadius: 'var(--embr-radius-sm)',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default FeatureHint;
