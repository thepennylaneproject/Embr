/**
 * Rate Limit Service
 * Tracks user actions to enforce rate limits
 */

import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitService {
  private rateLimitMap = new Map<string, Map<string, RateLimitEntry>>();

  /**
   * Check if action is allowed and increment counter
   * Returns true if action is allowed, false if rate limited
   */
  isAllowed(
    userId: string,
    action: string,
    maxRequests: number,
    windowMs: number,
  ): boolean {
    const now = Date.now();
    const key = `${userId}:${action}`;

    // Initialize user's rate limit map if not exists
    if (!this.rateLimitMap.has(userId)) {
      this.rateLimitMap.set(userId, new Map());
    }

    const userLimits = this.rateLimitMap.get(userId)!;
    const entry = userLimits.get(action);

    // Reset if window expired
    if (!entry || now > entry.resetTime) {
      userLimits.set(action, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      return false;
    }

    // Increment counter
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(userId: string, action: string, maxRequests: number): number {
    const userLimits = this.rateLimitMap.get(userId);
    if (!userLimits) return maxRequests;

    const entry = userLimits.get(action);
    if (!entry || Date.now() > entry.resetTime) {
      return maxRequests;
    }

    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Get reset time in milliseconds
   */
  getResetTime(userId: string, action: string): number {
    const userLimits = this.rateLimitMap.get(userId);
    if (!userLimits) return 0;

    const entry = userLimits.get(action);
    if (!entry) return 0;

    return Math.max(0, entry.resetTime - Date.now());
  }

  /**
   * Reset rate limit for user action
   */
  reset(userId: string, action: string): void {
    const userLimits = this.rateLimitMap.get(userId);
    if (userLimits) {
      userLimits.delete(action);
    }
  }

  /**
   * Clear all rate limits for user
   */
  clearUser(userId: string): void {
    this.rateLimitMap.delete(userId);
  }

  /**
   * Cleanup expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [userId, userLimits] of this.rateLimitMap.entries()) {
      for (const [action, entry] of userLimits.entries()) {
        if (now > entry.resetTime) {
          userLimits.delete(action);
        }
      }
      if (userLimits.size === 0) {
        this.rateLimitMap.delete(userId);
      }
    }
  }
}
