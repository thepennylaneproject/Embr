/**
 * OnboardingWizard
 * A multi-step onboarding flow shown to new users on first login.
 * State is tracked in localStorage (via OnboardingContext) — no backend changes required.
 */
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuth } from '@/contexts/AuthContext';

type WizardRole = 'creator' | 'supporter' | 'explorer';

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
  href: string;
}

const FEATURES: FeatureCard[] = [
  {
    icon: '📰',
    title: 'Feed',
    description: 'Follow creators and see what they are working on in real time.',
    href: '/feed',
  },
  {
    icon: '💼',
    title: 'Gigs',
    description: 'Post or apply to paid creative work — no hidden commissions.',
    href: '/gigs',
  },
  {
    icon: '🎵',
    title: 'Music',
    description: 'Discover, share, and license music from independent artists.',
    href: '/music',
  },
  {
    icon: '🏘',
    title: 'Groups',
    description: 'Connect around shared interests with focused community spaces.',
    href: '/groups',
  },
  {
    icon: '🗓',
    title: 'Events',
    description: 'Host and attend in-person and virtual community events.',
    href: '/events',
  },
  {
    icon: '🤝',
    title: 'Mutual Aid',
    description: 'Give and receive support from people in your community.',
    href: '/mutual-aid',
  },
];

const TOTAL_STEPS = 4;

const ROLE_OPTIONS = [
  {
    id: 'creator' as WizardRole,
    icon: '✨',
    title: 'Creator',
    description: 'I make things — art, music, writing, video, code, or anything else.',
  },
  {
    id: 'supporter' as WizardRole,
    icon: '🙌',
    title: 'Supporter',
    description: 'I discover great work and support the creators behind it.',
  },
  {
    id: 'explorer' as WizardRole,
    icon: '🔍',
    title: 'Explorer',
    description: 'I am just looking around to see what Embr has to offer.',
  },
];

export function OnboardingWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { loaded, wizardSeen, markWizardSeen } = useOnboarding();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<WizardRole | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Wait for client-side mount and auth load before showing
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && loaded && user && !wizardSeen) {
      // Small delay so the page behind renders first
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [mounted, loaded, user, wizardSeen]);

  const handleClose = () => {
    setVisible(false);
    markWizardSeen();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    setVisible(false);
    markWizardSeen();
    router.push('/profile/edit');
  };

  const handleGoToFeed = () => {
    setVisible(false);
    markWizardSeen();
  };

  const displayName = user?.profile?.displayName || user?.username || 'there';

  if (!mounted || !visible) return null;

  const content = (
    <div
      className="embr-onboarding-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
        background: 'rgba(41, 50, 65, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to Embr"
        style={{
          background: 'var(--embr-surface, #f7f3ef)',
          borderRadius: 'var(--embr-radius-xl, 24px)',
          boxShadow: 'var(--embr-shadow)',
          width: 'min(600px, 100%)',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Skip onboarding"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--embr-muted-text)',
            fontSize: '1.25rem',
            lineHeight: 1,
            padding: '0.25rem',
            borderRadius: 'var(--embr-radius-sm)',
          }}
        >
          ✕
        </button>

        {/* Step indicator */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            marginBottom: '2rem',
          }}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '3px',
                borderRadius: '2px',
                background: i <= step ? 'var(--embr-accent, #E8998D)' : 'var(--embr-border, #e2ded9)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>🔥</div>
            <h1
              style={{
                fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                fontWeight: 700,
                color: 'var(--embr-text)',
                margin: '0 0 0.75rem',
              }}
            >
              Welcome to Embr, {displayName}!
            </h1>
            <p
              style={{
                fontSize: '1rem',
                color: 'var(--embr-muted-text)',
                maxWidth: '400px',
                margin: '0 auto 2rem',
                lineHeight: 1.6,
              }}
            >
              A creator-focused platform built for you — not advertisers. Own your
              audience, earn fairly, and build real community.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '0.6rem',
                marginBottom: '2rem',
              }}
            >
              {['✅ No ads', '✅ 85–90% revenue share', '✅ Open platform'].map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: 'var(--embr-radius-xl)',
                    background: 'var(--embr-neutral-100, #ede9e3)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--embr-text)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <button className="ui-button" data-variant="primary" onClick={handleNext} style={{ minWidth: '180px' }}>
              Get started →
            </button>
          </div>
        )}

        {/* Step 1: Role selection */}
        {step === 1 && (
          <div>
            <h2
              style={{
                fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
                fontWeight: 700,
                color: 'var(--embr-text)',
                margin: '0 0 0.5rem',
              }}
            >
              What brings you here?
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--embr-muted-text)',
                margin: '0 0 1.5rem',
              }}
            >
              We will personalise your experience — you can always change this later.
            </p>

            <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.75rem' }}>
              {ROLE_OPTIONS.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--embr-radius-md)',
                      border: isSelected
                        ? '2px solid var(--embr-accent, #E8998D)'
                        : '2px solid var(--embr-border, #e2ded9)',
                      background: isSelected
                        ? 'var(--embr-primary-50, #fdf5f3)'
                        : 'var(--embr-bg, #faf7f4)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.18s',
                      width: '100%',
                    }}
                  >
                    <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{role.icon}</span>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          color: 'var(--embr-text)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {role.title}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--embr-muted-text)' }}>
                        {role.description}
                      </div>
                    </div>
                    {isSelected && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          color: 'var(--embr-accent)',
                          fontWeight: 700,
                          fontSize: '1.1rem',
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="ui-button"
                data-variant="ghost"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
              <button
                className="ui-button"
                data-variant="primary"
                onClick={handleNext}
              >
                {selectedRole ? 'Continue' : 'Skip for now'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Feature discovery */}
        {step === 2 && (
          <div>
            <h2
              style={{
                fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
                fontWeight: 700,
                color: 'var(--embr-text)',
                margin: '0 0 0.5rem',
              }}
            >
              Here's what awaits you
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--embr-muted-text)',
                margin: '0 0 1.5rem',
              }}
            >
              Embr is more than a social feed — it's a full platform for creative life.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.75rem',
              }}
            >
              {FEATURES.map((feature) => (
                <div
                  key={feature.href}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--embr-radius-md)',
                    border: '1.5px solid var(--embr-border, #e2ded9)',
                    background: 'var(--embr-bg, #faf7f4)',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{feature.icon}</div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--embr-text)',
                      marginBottom: '0.3rem',
                    }}
                  >
                    {feature.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--embr-muted-text)', lineHeight: 1.4 }}>
                    {feature.description}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="ui-button"
                data-variant="ghost"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
              <button className="ui-button" data-variant="primary" onClick={handleNext}>
                Almost there →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Finish */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1 }}>🎉</div>
            <h2
              style={{
                fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
                fontWeight: 700,
                color: 'var(--embr-text)',
                margin: '0 0 0.75rem',
              }}
            >
              You're all set!
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--embr-muted-text)',
                maxWidth: '380px',
                margin: '0 auto 2rem',
                lineHeight: 1.6,
              }}
            >
              Start by completing your profile — it helps the community find and connect with you.
            </p>

            <div
              style={{
                background: 'var(--embr-neutral-100, #ede9e3)',
                borderRadius: 'var(--embr-radius-md)',
                padding: '1.25rem',
                textAlign: 'left',
                marginBottom: '2rem',
              }}
            >
              <p
                style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: 'var(--embr-text)',
                  margin: '0 0 0.75rem',
                }}
              >
                First steps ✅
              </p>
              {[
                { label: 'Complete your profile', href: '/profile/edit' },
                { label: 'Make your first post', href: '/create' },
                { label: 'Explore the feed', href: '/feed' },
              ].map((item) => (
                <div
                  key={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 0',
                    fontSize: '0.875rem',
                    color: 'var(--embr-muted-text)',
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '2px solid var(--embr-border)',
                      flexShrink: 0,
                    }}
                  />
                  {item.label}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="ui-button"
                data-variant="secondary"
                onClick={handleGoToFeed}
              >
                Go to feed
              </button>
              <button
                className="ui-button"
                data-variant="primary"
                onClick={handleFinish}
              >
                Complete profile →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export default OnboardingWizard;
