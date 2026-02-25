/**
 * Analytics Service
 * Simple event tracking for Phase 1 MVP
 * Tracks: posts, gigs, earnings, payouts, onboarding
 */

export enum AnalyticsEvent {
  // Onboarding
  ONBOARDING_STARTED = 'onboarding_started',
  ONBOARDING_COMPLETED = 'onboarding_completed',
  PROFILE_COMPLETED = 'profile_completed',
  FIRST_POST_CREATED = 'first_post_created',

  // Content
  POST_CREATED = 'post_created',
  POST_DELETED = 'post_deleted',

  // Gigs
  GIG_VIEWED = 'gig_viewed',
  GIG_APPLIED = 'gig_applied',
  GIG_COMPLETED = 'gig_completed',

  // Earnings
  TIP_RECEIVED = 'tip_received',
  PAYMENT_RECEIVED = 'payment_received',
  FIRST_EARNING = 'first_earning',

  // Payouts
  PAYOUT_REQUESTED = 'payout_requested',
  PAYOUT_COMPLETED = 'payout_completed',

  // Engagement
  POST_LIKED = 'post_liked',
  COMMENT_CREATED = 'comment_created',
  PROFILE_VIEWED = 'profile_viewed',
  FOLLOW_CREATED = 'follow_created',

  // Navigation
  PAGE_VIEW = 'page_view',
}

export interface AnalyticsEventData {
  userId?: string;
  event: AnalyticsEvent;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Analytics Service
 * Stores events locally and sends to backend
 */
class AnalyticsService {
  private events: AnalyticsEventData[] = [];
  private userId?: string;
  private batchSize = 10;
  private flushInterval = 60000; // 1 minute
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startPeriodicFlush();
    }
  }

  /**
   * Set the current user ID
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Track an event
   */
  track(event: AnalyticsEvent, data?: Record<string, any>) {
    const eventData: AnalyticsEventData = {
      userId: this.userId,
      event,
      timestamp: Date.now(),
      ...data,
    };

    this.events.push(eventData);

    // Flush if we've reached the batch size
    if (this.events.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Track a page view
   */
  trackPageView(page: string, properties?: Record<string, any>) {
    this.track(AnalyticsEvent.PAGE_VIEW, {
      page,
      ...properties,
    });
  }

  /**
   * Flush pending events
   */
  async flush() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      }).catch(() => {
        // Fail silently - don't impact user experience
        // Re-add events for next flush
        this.events.unshift(...eventsToSend);
      });
    } catch (error) {
      console.error('Analytics flush failed:', error);
      // Re-add events for retry
      this.events.unshift(...eventsToSend);
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush() {
    if (typeof window !== 'undefined') {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.flushInterval);

      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }

  /**
   * Stop periodic flush
   */
  stopPeriodicFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();
