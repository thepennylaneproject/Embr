/**
 * WelcomeBanner
 * A dismissible banner shown on the feed page for users who haven't
 * completed their onboarding checklist. Surfaces the onboarding progress
 * and links to key first actions.
 */
import React from 'react';
import Link from 'next/link';
import { useOnboarding, OnboardingStepId } from '@/contexts/OnboardingContext';

interface ChecklistItem {
  id: OnboardingStepId;
  label: string;
  href: string;
  icon: string;
}

const CHECKLIST: ChecklistItem[] = [
  { id: 'profile', label: 'Complete your profile', href: '/profile/edit', icon: '👤' },
  { id: 'first_post', label: 'Make your first post', href: '/create', icon: '✍️' },
  { id: 'follow_creator', label: 'Follow a creator', href: '/discover', icon: '🔍' },
  { id: 'explore_gigs', label: 'Explore gigs', href: '/gigs', icon: '💼' },
];

export function WelcomeBanner() {
  const { loaded, bannerDismissed, allStepsComplete, isStepComplete, dismissBanner, completeStep } =
    useOnboarding();

  if (!loaded || bannerDismissed || allStepsComplete) return null;

  const completedCount = CHECKLIST.filter((item) => isStepComplete(item.id)).length;
  const progressPercent = (completedCount / CHECKLIST.length) * 100;

  return (
    <div
      style={{
        borderRadius: 'var(--embr-radius-lg)',
        border: '1.5px solid var(--embr-border)',
        background: 'var(--embr-surface)',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        position: 'relative',
      }}
      role="region"
      aria-label="Getting started checklist"
    >
      {/* Dismiss button */}
      <button
        onClick={dismissBanner}
        aria-label="Dismiss getting started checklist"
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--embr-muted-text)',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0.25rem',
          borderRadius: 'var(--embr-radius-sm)',
        }}
      >
        ✕
      </button>

      {/* Header */}
      <div style={{ marginBottom: '1rem', paddingRight: '1.5rem' }}>
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--embr-text)',
            margin: '0 0 0.2rem',
          }}
        >
          Get started on Embr
        </h2>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--embr-muted-text)',
            margin: 0,
          }}
        >
          {completedCount === 0
            ? 'Complete these steps to get the most out of Embr.'
            : `${completedCount} of ${CHECKLIST.length} steps complete — keep going!`}
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          background: 'var(--embr-border)',
          borderRadius: '2px',
          marginBottom: '1.1rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'var(--embr-accent)',
            borderRadius: '2px',
            transition: 'width 0.4s ease',
          }}
          aria-valuenow={completedCount}
          aria-valuemax={CHECKLIST.length}
          role="progressbar"
          aria-label={`${completedCount} of ${CHECKLIST.length} steps complete`}
        />
      </div>

      {/* Checklist items */}
      <div
        style={{
          display: 'grid',
          gap: '0.6rem',
        }}
      >
        {CHECKLIST.map((item) => {
          const done = isStepComplete(item.id);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (!done) completeStep(item.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--embr-radius-sm)',
                border: '1px solid var(--embr-border)',
                background: done ? 'var(--embr-neutral-100)' : 'var(--embr-bg)',
                textDecoration: 'none',
                transition: 'border-color 0.15s, background 0.15s',
                opacity: done ? 0.7 : 1,
              }}
            >
              {/* Status icon */}
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: done ? 'none' : '2px solid var(--embr-border)',
                  background: done ? 'var(--embr-accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.65rem',
                  color: '#fff',
                  fontWeight: 700,
                }}
                aria-hidden="true"
              >
                {done ? '✓' : ''}
              </span>

              <span style={{ fontSize: '1rem' }} aria-hidden="true">
                {item.icon}
              </span>

              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: done ? 'var(--embr-muted-text)' : 'var(--embr-text)',
                  textDecoration: done ? 'line-through' : 'none',
                }}
              >
                {item.label}
              </span>

              {!done && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.75rem',
                    color: 'var(--embr-accent)',
                    fontWeight: 600,
                  }}
                >
                  Start →
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default WelcomeBanner;
