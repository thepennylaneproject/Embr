/**
 * JWT Token Utilities
 * Shared JWT generation, validation, and decoding across verticals
 */

import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  role: 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: string = '24h',
): string {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(
  userId: string,
  secret: string,
  expiresIn: string = '7d',
): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string, secret: string): JwtPayload {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Decode token without verification (for debugging/parsing only)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return decoded.exp * 1000 < Date.now();
}

/**
 * Extract user ID from token
 */
export function extractUserIdFromToken(token: string): string | null {
  const decoded = decodeToken(token);
  return decoded?.sub || null;
}
