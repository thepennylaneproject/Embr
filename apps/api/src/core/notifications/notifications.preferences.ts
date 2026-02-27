/**
 * Notification Preferences Types
 * User control over which notification types they receive
 */

export const NOTIFICATION_PREFERENCE_TYPES = {
  ALL: 'all',           // Receive all notifications
  IMPORTANT: 'important', // Only critical notifications
  NONE: 'none',         // Disable all notifications
} as const;

export type NotificationPreferenceType = typeof NOTIFICATION_PREFERENCE_TYPES[keyof typeof NOTIFICATION_PREFERENCE_TYPES];

/**
 * Granular notification settings per type
 */
export interface NotificationSettings {
  // Social notifications
  newFollower: boolean;
  newComment: boolean;
  commentReply: boolean;
  commentLiked: boolean;
  postLiked: boolean;

  // Gig notifications
  gigApplication: boolean;
  gigApplicationAccepted: boolean;
  gigApplicationRejected: boolean;
  gigMilestoneCompleted: boolean;

  // Monetization
  tipReceived: boolean;

  // Safety & Moderation
  moderationAction: boolean;
  reportResolved: boolean;

  // Messages
  messageReceived: boolean;

  // Other
  payoutProcessed: boolean;
}

/**
 * Default notification settings (all enabled)
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  newFollower: true,
  newComment: true,
  commentReply: true,
  commentLiked: true,
  postLiked: true,
  gigApplication: true,
  gigApplicationAccepted: true,
  gigApplicationRejected: true,
  gigMilestoneCompleted: true,
  tipReceived: true,
  moderationAction: true,
  reportResolved: true,
  messageReceived: true,
  payoutProcessed: true,
};

/**
 * Map notification types to preference settings
 */
export const NOTIFICATION_TYPE_TO_PREFERENCE = {
  NEW_FOLLOWER: 'newFollower',
  NEW_COMMENT: 'newComment',
  COMMENT_REPLY: 'commentReply',
  COMMENT_LIKED: 'commentLiked',
  POST_LIKED: 'postLiked',
  TIP_RECEIVED: 'tipReceived',
  GIG_APPLICATION: 'gigApplication',
  GIG_APPLICATION_ACCEPTED: 'gigApplicationAccepted',
  GIG_APPLICATION_REJECTED: 'gigApplicationRejected',
  GIG_MILESTONE_COMPLETED: 'gigMilestoneCompleted',
  MODERATION_ACTION: 'moderationAction',
  REPORT_RESOLVED: 'reportResolved',
  MESSAGE_RECEIVED: 'messageReceived',
  PAYOUT_PROCESSED: 'payoutProcessed',
} as const;
