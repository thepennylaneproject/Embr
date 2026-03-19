/**
 * CreatorOnboarding
 * Guides new creators through their first 3 actions: profile, post, and earning.
 * Uses design system CSS custom properties (no hardcoded color values).
 */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsEvent } from '@/lib/analytics';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { copy } from '@/lib/copy';

interface CreatorStep {
  id: 'profile' | 'post' | 'earning';
  title: string;
  description: string;
  icon: string;
  cta: string;
  ctaAction: () => void;
}

interface CreatorOnboardingProps {
  userId: string;
  onComplete?: () => void;
}

export const CreatorOnboarding: React.FC<CreatorOnboardingProps> = ({ userId, onComplete }) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const { isStepComplete, completeStep } = useOnboarding();
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);

  const steps: CreatorStep[] = [
    {
      id: 'profile',
      title: copy.onboardingChecklist.steps.profile.title,
      description: copy.onboardingChecklist.steps.profile.description,
      icon: copy.onboardingChecklist.steps.profile.icon,
      cta: copy.onboardingChecklist.steps.profile.cta,
      ctaAction: () => router.push('/profile/edit'),
    },
    {
      id: 'post',
      title: copy.onboardingChecklist.steps.post.title,
      description: copy.onboardingChecklist.steps.post.description,
      icon: copy.onboardingChecklist.steps.post.icon,
      cta: copy.onboardingChecklist.steps.post.cta,
      ctaAction: () => router.push('/create'),
    },
    {
      id: 'earning',
      title: copy.onboardingChecklist.steps.earning.title,
      description: copy.onboardingChecklist.steps.earning.description,
      icon: copy.onboardingChecklist.steps.earning.icon,
      cta: copy.onboardingChecklist.steps.earning.cta,
      ctaAction: () => router.push('/gigs'),
    },
  ];

  // Map creator step IDs to onboarding step IDs
  const stepToOnboardingId = {
    profile: 'profile' as const,
    post: 'first_post' as const,
    earning: 'explore_gigs' as const,
  };

  const isCreatorStepComplete = (id: CreatorStep['id']) => {
    return isStepComplete(stepToOnboardingId[id]);
  };

  const completedCount = steps.filter((s) => isCreatorStepComplete(s.id)).length;
  const allComplete = completedCount === steps.length;

  useEffect(() => {
    if (!hasTrackedStart) {
      analytics.track(AnalyticsEvent.ONBOARDING_STARTED);
      setHasTrackedStart(true);
    }
  }, [userId, analytics, hasTrackedStart]);

  const handleStepAction = (step: CreatorStep) => {
    if (isCreatorStepComplete(step.id)) return;
    completeStep(stepToOnboardingId[step.id]);

    if (steps.every((s) => s.id === step.id || isCreatorStepComplete(s.id))) {
      setShowCelebration(true);
      analytics.track(AnalyticsEvent.ONBOARDING_COMPLETED);
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }

    step.ctaAction();
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Celebration state */}
      {showCelebration && (
        <div
          style={{
            padding: '2rem',
            background: 'var(--embr-primary-50, #fdf5f3)',
            border: '2px solid var(--embr-accent)',
            borderRadius: 'var(--embr-radius-md)',
            textAlign: 'center',
            marginBottom: '2rem',
          }}
        >
          <p style={{ fontSize: '2rem', margin: '0 0 0.75rem', lineHeight: 1 }}>🎉</p>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--embr-text)',
              margin: '0 0 0.5rem',
            }}
          >
            {copy.onboardingChecklist.celebration.title}
          </h3>
          <p style={{ fontSize: '1rem', color: 'var(--embr-muted-text)', margin: 0 }}>
            {copy.onboardingChecklist.celebration.subtitle}
          </p>
        </div>
      )}

      {/* Header with progress */}
      {!allComplete && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--embr-text)',
              margin: '0 0 0.3rem',
            }}
          >
            {copy.onboardingChecklist.title}
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--embr-muted-text)',
              margin: '0 0 1rem',
            }}
          >
            {copy.onboardingChecklist.subtitle}
          </p>

          {/* Progress bar */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '0.4rem',
            }}
          >
            {steps.map((step) => (
              <div
                key={step.id}
                style={{
                  flex: 1,
                  height: '4px',
                  background: isCreatorStepComplete(step.id)
                    ? 'var(--embr-accent)'
                    : 'var(--embr-border)',
                  borderRadius: '2px',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--embr-muted-text)',
              margin: 0,
            }}
          >
            {copy.onboardingChecklist.progressLabel(completedCount, steps.length)}
          </p>
        </div>
      )}

      {/* Step cards */}
      {!allComplete && (
        <div style={{ display: 'grid', gap: '0.875rem', marginBottom: '1.5rem' }}>
          {steps.map((step) => {
            const done = isCreatorStepComplete(step.id);
            return (
              <div
                key={step.id}
                style={{
                  padding: '1.1rem 1.25rem',
                  background: done ? 'var(--embr-neutral-100)' : 'var(--embr-bg)',
                  border: `1.5px solid ${done ? 'var(--embr-success)' : 'var(--embr-border)'}`,
                  borderRadius: 'var(--embr-radius-md)',
                  cursor: done ? 'default' : 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                  opacity: done ? 0.8 : 1,
                }}
                onClick={() => {
                  if (!done) handleStepAction(step);
                }}
                onKeyDown={(e) => {
                  if (!done && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleStepAction(step);
                  }
                }}
                role={done ? undefined : 'button'}
                tabIndex={done ? undefined : 0}
                aria-label={done ? `${step.title} (completed)` : step.title}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  {/* Icon circle */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: done ? 'var(--embr-success)' : 'var(--embr-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: done ? '1.1rem' : '1.25rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {done ? '✓' : step.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: 'var(--embr-text)',
                        margin: '0 0 0.25rem',
                      }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--embr-muted-text)',
                        margin: '0 0 0.75rem',
                      }}
                    >
                      {step.description}
                    </p>

                    {done ? (
                      <p
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--embr-success)',
                          fontWeight: 700,
                          margin: 0,
                        }}
                      >
                        {copy.onboardingChecklist.stepCompleteLabel}
                      </p>
                    ) : (
                      <button
                        className="ui-button"
                        data-variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepAction(step);
                        }}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                      >
                        {step.cta}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion CTA */}
      {allComplete && (
        <div
          style={{
            padding: '2rem',
            background: 'var(--embr-surface)',
            border: '1.5px solid var(--embr-border)',
            borderRadius: 'var(--embr-radius-md)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--embr-text)',
              margin: '0 0 0.5rem',
            }}
          >
            {copy.onboardingChecklist.readyTitle}
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--embr-muted-text)',
              margin: '0 0 1.25rem',
            }}
          >
            {copy.onboardingChecklist.readySubtitle}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              className="ui-button"
              data-variant="primary"
              onClick={() => router.push('/gigs')}
            >
              {copy.onboardingChecklist.browseGigs}
            </button>
            <button
              className="ui-button"
              data-variant="secondary"
              onClick={() => router.push('/feed')}
            >
              {copy.onboardingChecklist.viewFeed}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorOnboarding;
