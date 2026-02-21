/**
 * Token Utilities
 * Refresh tokens, verification tokens, and password reset tokens
 */

import * as crypto from 'crypto';

/**
 * Generate secure random token (for email verification, password reset)
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate token with expiration timestamp
 */
export function generateTokenWithExpiry(expiryMinutes: number = 30): {
  token: string;
  expiresAt: Date;
} {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  return { token, expiresAt };
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Hash token for storage (never store plain tokens in DB)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify token hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}

/**
 * Generate email verification token
 */
export function generateEmailVerificationToken(): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const { token, expiresAt } = generateTokenWithExpiry(24 * 60); // 24 hours
  const hash = hashToken(token);

  return { token, hash, expiresAt };
}

/**
 * Generate password reset token
 */
export function generatePasswordResetToken(): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const { token, expiresAt } = generateTokenWithExpiry(60); // 1 hour
  const hash = hashToken(token);

  return { token, hash, expiresAt };
}

/**
 * Generate refresh token
 */
export function generateRefreshTokenData(expiryDays: number = 7): {
  token: string;
  hash: string;
  expiresAt: Date;
} {
  const { token, expiresAt } = generateTokenWithExpiry(expiryDays * 24 * 60);
  const hash = hashToken(token);

  return { token, hash, expiresAt };
}
