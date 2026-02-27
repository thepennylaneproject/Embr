/**
 * Messaging Rate Limits Configuration
 * Defines rate limiting policies for different message send scenarios
 */

export const MESSAGE_RATE_LIMITS = {
  // Per-user per-conversation limits
  USER_PER_CONVERSATION: {
    messagesPerMinute: parseInt(process.env.MESSAGING_RATE_LIMIT_MAX || '60', 10),
    windowMs: parseInt(process.env.MESSAGING_RATE_LIMIT_WINDOW || '60000', 10),
  },

  // Burst limits (per second) - prevents flood of messages
  BURST_LIMIT: {
    messagesPerSecond: parseInt(process.env.MESSAGING_RATE_LIMIT_BURST || '5', 10),
    windowMs: 1000,
  },

  // Per-conversation limits (all users combined)
  PER_CONVERSATION: {
    messagesPerMinute: 100,
    windowMs: 60000,
  },
};

/**
 * Convert configuration to RateLimitConfig format expected by MessageRateLimiterService
 */
export function toRateLimitConfig(config: { messagesPerMinute: number; windowMs: number }) {
  return {
    maxTokens: config.messagesPerMinute,
    refillRate: config.messagesPerMinute / config.windowMs,
    windowMs: config.windowMs,
  };
}
