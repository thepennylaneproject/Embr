import { Request } from 'express';
import { UserRole } from '@prisma/client';

/**
 * The user object attached to the request after JWT authentication.
 * Matches the shape returned by JwtStrategy.validate() (sanitized User row).
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: UserRole;
  isVerified: boolean;
  suspended: boolean;
  suspendedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  unreadNotificationCount: number;
}

/**
 * Express Request augmented with the authenticated user payload set by
 * JwtAuthGuard / PassportStrategy. Use this type for `@Request() req`
 * parameters in NestJS controllers protected by JwtAuthGuard.
 */
export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
