/**
 * Creator Onboarding Flow
 * Guides new creators to their first earning in 3 simple steps
 * Low friction, high clarity
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsEvent } from '@/lib/analytics';

interface OnboardingStep {
  id: 'profile' | 'post' | 'earning';
  title: string;
  description: string;
  icon: string;
  cta: string;
  ctaAction: () => void;
  completed: boolean;
}

interface CreatorOnboardingProps {
  userId: string;
  onComplete?: () => void;
}

export const CreatorOnboarding: React.FC<CreatorOnboardingProps> = ({ userId, onComplete }) => {
  const router = useRouter();
  const analytics = useAnalytics();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    loadOnboardingProgress();
    analytics.track(AnalyticsEvent.ONBOARDING_STARTED);
  }, [userId, analytics]);

  const loadOnboardingProgress = async () => {
    try {
      // TODO: Load from API if user has completed onboarding steps
      // For now, assume no steps completed on first visit
      const newSteps: OnboardingStep[] = [
        {
          id: 'profile',
          title: 'Complete Your Profile',
          description: 'Add a photo and bio so clients know who you are.',
          icon: '👤',
          cta: 'Set Up Profile',
          ctaAction: () => router.push('/settings/profile'),
          completed: false,
        },
        {
          id: 'post',
          title: 'Post Your First Content',
          description: 'Share your work to start building your audience.',
          icon: '✨',
          cta: 'Create First Post',
          ctaAction: () => router.push('/create'),
          completed: false,
        },
        {
          id: 'earning',
          title: 'Get Your First Tip',
          description: 'Browse opportunities and earn money for your work.',
          icon: '💰',
          cta: 'Find Work',
          ctaAction: () => router.push('/gigs'),
          completed: false,
        },
      ];
      setSteps(newSteps);
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    }
  };

  const handleStepComplete = (stepId: string) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, completed: true } : s));

    // If all steps done, show celebration
    if (steps.every(s => s.id === stepId || s.completed)) {
      setShowCelebration(true);
      analytics.track(AnalyticsEvent.ONBOARDING_COMPLETED);
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  };

  const completedCount = steps.filter(s => s.completed).length;
  const allComplete = completedCount === steps.length;

  return (
    <div style={{ marginBottom: '48px' }}>
      {/* CELEBRATION STATE */}
      {showCelebration && (
        <div style={{
          padding: '32px',
          backgroundColor: '#fff9e6',
          border: '2px solid #E8998D',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          <p style={{ fontSize: '32px', margin: '0 0 12px 0' }}>🎉</p>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#000', margin: '0 0 8px 0' }}>
            Welcome to Embr!
          </h3>
          <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>
            You're all set. Time to start earning.
          </p>
        </div>
      )}

      {/* ONBOARDING HEADER - if not complete */}
      {!allComplete && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#000', marginBottom: '8px', margin: 0 }}>
            Get Started Earning
          </h2>
          <p style={{ fontSize: '14px', color: '#999', margin: '8px 0 0 0' }}>
            Complete these 3 steps to earn your first tip
          </p>

          {/* PROGRESS BAR */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  style={{
                    flex: 1,
                    height: '4px',
                    backgroundColor: step.completed ? '#E8998D' : '#e0e0e0',
                    borderRadius: '2px',
                    transition: 'all 300ms',
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '8px', margin: 0 }}>
              {completedCount} of {steps.length} complete
            </p>
          </div>
        </div>
      )}

      {/* STEPS LIST */}
      {!allComplete && (
        <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
          {steps.map((step, idx) => (
            <div
              key={step.id}
              style={{
                padding: '20px',
                backgroundColor: step.completed ? '#f0fdf4' : '#f5f5f5',
                border: `2px solid ${step.completed ? '#22c55e' : '#e0e0e0'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
              onClick={() => !step.completed && step.ctaAction()}
              onMouseEnter={(e) => {
                if (!step.completed) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                  e.currentTarget.style.borderColor = '#E8998D';
                }
              }}
              onMouseLeave={(e) => {
                if (!step.completed) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }
              }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* STEP NUMBER/ICON */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: step.completed ? '#22c55e' : '#E8998D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {step.completed ? '✓' : step.icon}
                </div>

                {/* STEP CONTENT */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#000', margin: '0 0 4px 0' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#666', margin: '0 0 12px 0' }}>
                    {step.description}
                  </p>

                  {step.completed ? (
                    <p style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600, margin: 0 }}>
                      ✓ Complete
                    </p>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        step.ctaAction();
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 600,
                        backgroundColor: '#E8998D',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {step.cta}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AFTER COMPLETE - NEXT ACTIONS */}
      {allComplete && (
        <div style={{ padding: '32px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#000', marginBottom: '16px', margin: 0 }}>
            🚀 Ready to earn
          </p>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', margin: '12px 0 0 0' }}>
            Start applying to gigs and grow your audience
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/gigs')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#E8998D',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Browse Gigs
            </button>
            <button
              onClick={() => router.push('/feed')}
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: '#E8998D',
                border: '2px solid #E8998D',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View Feed
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorOnboarding;
