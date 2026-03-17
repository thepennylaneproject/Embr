import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsEvent } from '@/lib/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';

export type OnboardingStepId = 'profile' | 'first_post' | 'explore_gigs' | 'follow_creator';

interface OnboardingState {
  wizardSeen: boolean;
  completedSteps: OnboardingStepId[];
  bannerDismissed: boolean;
  dismissedTooltips: string[];
  visitedPages: string[];
}

const DEFAULT_STATE: OnboardingState = {
  wizardSeen: false,
  completedSteps: [],
  bannerDismissed: false,
  dismissedTooltips: [],
  visitedPages: [],
};

interface OnboardingContextType {
  loaded: boolean;
  wizardSeen: boolean;
  bannerDismissed: boolean;
  completedSteps: OnboardingStepId[];
  visitedPages: string[];
  allStepsComplete: boolean;
  markWizardSeen: () => void;
  dismissBanner: () => void;
  completeStep: (step: OnboardingStepId) => void;
  markPageVisited: (page: string) => void;
  dismissTooltip: (id: string) => void;
  isTooltipSeen: (id: string) => boolean;
  isStepComplete: (step: OnboardingStepId) => boolean;
  isPageVisited: (page: string) => boolean;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STEPS: OnboardingStepId[] = [
  'profile',
  'first_post',
  'explore_gigs',
  'follow_creator',
];

function getStorageKey(userId: string) {
  return `embr:onboarding:${userId}`;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoaded(true);
      return;
    }

    if (!user?.id) {
      // Reset to default when no user (logged out)
      setState(DEFAULT_STATE);
      setLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(getStorageKey(user.id));
      if (stored) {
        setState({ ...DEFAULT_STATE, ...JSON.parse(stored) });
      } else {
        setState(DEFAULT_STATE);
      }
    } catch {
      setState(DEFAULT_STATE);
    }
    setLoaded(true);
  }, [user?.id]);

  const persist = useCallback(
    (next: OnboardingState) => {
      setState(next);
      if (!user?.id || typeof window === 'undefined') return;
      try {
        localStorage.setItem(getStorageKey(user.id), JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
    },
    [user?.id],
  );

  const markWizardSeen = useCallback(() => {
    if (state.wizardSeen) return;
    persist({ ...state, wizardSeen: true });
    analytics.track(AnalyticsEvent.ONBOARDING_STARTED);
  }, [state, persist, analytics]);

  const dismissBanner = useCallback(() => {
    persist({ ...state, bannerDismissed: true });
  }, [state, persist]);

  const completeStep = useCallback(
    (step: OnboardingStepId) => {
      if (state.completedSteps.includes(step)) return;
      const next: OnboardingState = {
        ...state,
        completedSteps: [...state.completedSteps, step],
      };
      persist(next);
      if (ONBOARDING_STEPS.every((s) => next.completedSteps.includes(s))) {
        analytics.track(AnalyticsEvent.ONBOARDING_COMPLETED);
      }
    },
    [state, persist, analytics],
  );

  const markPageVisited = useCallback(
    (page: string) => {
      if (state.visitedPages.includes(page)) return;
      persist({ ...state, visitedPages: [...state.visitedPages, page] });
    },
    [state, persist],
  );

  const dismissTooltip = useCallback(
    (id: string) => {
      if (state.dismissedTooltips.includes(id)) return;
      persist({ ...state, dismissedTooltips: [...state.dismissedTooltips, id] });
    },
    [state, persist],
  );

  const isTooltipSeen = useCallback(
    (id: string) => {
      return state.dismissedTooltips.includes(id);
    },
    [state.dismissedTooltips],
  );

  const isStepComplete = useCallback(
    (step: OnboardingStepId) => {
      return state.completedSteps.includes(step);
    },
    [state.completedSteps],
  );

  const isPageVisited = useCallback(
    (page: string) => {
      return state.visitedPages.includes(page);
    },
    [state.visitedPages],
  );

  const resetOnboarding = useCallback(() => {
    persist(DEFAULT_STATE);
  }, [persist]);

  const allStepsComplete = ONBOARDING_STEPS.every((s) => state.completedSteps.includes(s));

  return (
    <OnboardingContext.Provider
      value={{
        loaded,
        wizardSeen: state.wizardSeen,
        bannerDismissed: state.bannerDismissed,
        completedSteps: state.completedSteps,
        visitedPages: state.visitedPages,
        allStepsComplete,
        markWizardSeen,
        dismissBanner,
        completeStep,
        markPageVisited,
        dismissTooltip,
        isTooltipSeen,
        isStepComplete,
        isPageVisited,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return ctx;
}
