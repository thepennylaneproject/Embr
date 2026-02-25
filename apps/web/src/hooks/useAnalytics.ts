/**
 * useAnalytics Hook
 * Simple analytics tracking for components
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { analytics, AnalyticsEvent } from '@/lib/analytics';

/**
 * Hook to set up analytics
 * Initializes user ID and tracks page views
 */
export const useAnalytics = () => {
  const { user } = useAuth();
  const router = useRouter();

  // Set user ID when auth is ready
  useEffect(() => {
    if (user?.id) {
      analytics.setUserId(user.id);
    }
  }, [user?.id]);

  // Track page views
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      analytics.trackPageView(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return analytics;
};

/**
 * Track a specific event
 */
export const useTrackEvent = (eventName: AnalyticsEvent) => {
  return (data?: Record<string, any>) => {
    analytics.track(eventName, data);
  };
};
