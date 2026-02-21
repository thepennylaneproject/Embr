/**
 * Shared Auth Types
 */

export type UserRole = 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isVerified: boolean;
  suspended: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
  message?: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
  username: string;
  role: UserRole;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
