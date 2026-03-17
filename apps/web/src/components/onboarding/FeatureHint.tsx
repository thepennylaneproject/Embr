/**
 * FeatureHint
 * A dismissible hint banner shown once per page to explain what the feature does.
 * Uses OnboardingContext to track which pages have been visited.
 * Stops appearing after the user has seen it (localStorage-backed).
 */
import React, { useEffect } from 'react';
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
  const [dismissed, setDismissed] = React.useState(false);

  // Mark page as visited once it's been seen
  useEffect(() => {
    if (!loaded || !user) return;
    if (!isPageVisited(pageId)) {
      markPageVisited(pageId);
    }
  }, [loaded, user, pageId, isPageVisited, markPageVisited]);

  // Only show on first visit (before the effect marks it as visited)
  const shouldShow = loaded && user && !isPageVisited(pageId) && !dismissed;

  if (!shouldShow) return null;

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
        onClick={() => setDismissed(true)}
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
