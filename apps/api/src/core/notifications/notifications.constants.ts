/**
 * Notification Types
 * Centralized constants for all notification type identifiers
 */

export const NOTIFICATION_TYPES = {
  // Social interactions
  NEW_FOLLOWER: 'NEW_FOLLOWER',
  NEW_COMMENT: 'NEW_COMMENT',
  COMMENT_REPLY: 'COMMENT_REPLY',
  COMMENT_LIKED: 'COMMENT_LIKED',
  POST_LIKED: 'POST_LIKED',

  // Monetization
  TIP_RECEIVED: 'TIP_RECEIVED',
  TIP_SENT: 'TIP_SENT',

  // Gig & Freelance
  GIG_APPLICATION: 'GIG_APPLICATION',
  GIG_APPLICATION_ACCEPTED: 'GIG_APPLICATION_ACCEPTED',
  GIG_APPLICATION_REJECTED: 'GIG_APPLICATION_REJECTED',
  GIG_MILESTONE_COMPLETED: 'GIG_MILESTONE_COMPLETED',

  // Safety & Moderation
  MODERATION_ACTION: 'MODERATION_ACTION',
  REPORT_RESOLVED: 'REPORT_RESOLVED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',

  // Messages & Communication
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
  MESSAGE_READ: 'MESSAGE_READ',

  // Stripe & Payment
  STRIPE_ONBOARDING_COMPLETE: 'STRIPE_ONBOARDING_COMPLETE',
  PAYOUT_PROCESSED: 'PAYOUT_PROCESSED',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

/**
 * Notification event names for event emitter
 */
export const NOTIFICATION_EVENTS = {
  CREATED: 'notification.created',
  READ: 'notification.read',
  DELETED: 'notification.deleted',
} as const;
