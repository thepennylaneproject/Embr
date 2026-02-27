// apps/api/src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

import { EmailService } from '../email/email.service';
import { SignUpDto, LoginDto } from './dto';
import { PrismaService } from '../database/prisma.service';
import { hashPassword, verifyPassword } from '@embr/auth';

interface TokenPayload {
  sub: string;
  email: string;
  username: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: any;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  // =====================
  // SIGNUP & LOGIN
  // =====================

  async signUp(signUpDto: SignUpDto): Promise<{ user: any; message: string }> {
    const { email, username, password, fullName } = signUpDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Username already taken');
    }

    // Hash password using shared utility
    const passwordHash = await hashPassword(password);

    // Create user with profile and wallet
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        fullName,
        isVerified: false,
        profile: {
          create: {
            username,
            displayName: fullName || username,
            bio: '',
          },
        },
        wallet: {
          create: {
            balance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
          },
        },
      },
      include: {
        profile: true,
        wallet: true,
      },
    });

    // Send verification email
    await this.sendVerificationEmail(user);

    // Don't return tokens - user must verify email first
    return {
      user: this.sanitizeUser(user),
      message: 'Account created. Please check your email to verify your account.',
    };
  }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const { email, password } = loginDto;

    // Find user with profile
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true, wallet: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // =====================
  // GOOGLE OAUTH
  // =====================

  async googleLogin(googleUser: any): Promise<TokenResponse> {
    if (!googleUser) {
      throw new UnauthorizedException('No user from Google');
    }

    const { email, firstName, lastName, picture, googleId } = googleUser;

    // Check if user exists
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { googleId }] },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      // Create new user from Google data
      const username = email.split('@')[0] + '_' + Date.now().toString().slice(-4);

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          fullName: `${firstName} ${lastName}`,
          googleId,
          isVerified: true, // Google emails are pre-verified
          profile: {
            create: {
              username,
              displayName: `${firstName} ${lastName}`,
              avatarUrl: picture,
            },
          },
          wallet: {
            create: {
              balance: 0,
              pendingBalance: 0,
              totalEarned: 0,
              totalWithdrawn: 0,
            },
          },
        },
        include: { profile: true, wallet: true },
      });
    } else if (!user.googleId) {
      // Link Google account to existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          isVerified: true,
          profile: user.profile
            ? {
                update: {
                  avatarUrl: user.profile?.avatarUrl || picture,
                },
              }
            : {
                create: {
                  username: user.username,
                  displayName: user.fullName || user.username,
                  avatarUrl: picture,
                },
              },
        },
        include: { profile: true, wallet: true },
      });
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // =====================
  // TOKEN MANAGEMENT
  // =====================

  private async generateTokens(
    user: any,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    });

    // Calculate refresh token expiry from config (default 30 days)
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '30d';
    const refreshTokenExpiresMs = this.parseExpireTime(refreshExpiresIn);

    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    // Store refresh token in database with matching expiry and device info
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + refreshTokenExpiresMs),
        userAgent: userAgent || null,
        ipAddress: ipAddress || null,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private parseExpireTime(expireTime: string): number {
    const match = expireTime.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'h':
        return num * 60 * 60 * 1000;
      case 'd':
        return num * 24 * 60 * 60 * 1000;
      default:
        return 30 * 24 * 60 * 60 * 1000;
    }
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokenResponse> {
    // Verify refresh token exists and is not expired
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        token: refreshToken,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Revoke the specific refresh token
    await this.prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken },
      data: { isRevoked: true },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    // Revoke all refresh tokens for the user
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  // =====================
  // PASSWORD MANAGEMENT
  // =====================

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If that email is in our system, you will receive a verification code.' };
    }

    // Generate email verification code (6 digits)
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 10);

    // Create verification code token with short TTL (10 minutes)
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedCode,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        isVerified: false, // Add flag to track if this is just verification
      },
    });

    // Send verification code via email
    await this.emailService.sendPasswordResetVerificationEmail(user.email, verificationCode);

    return { message: 'Verification code sent to your email. Please verify to proceed with password reset.' };
  }

  /**
   * Verify the email verification code sent during password reset
   * Returns a temporary reset token that can be used to actually reset the password
   */
  async verifyPasswordResetEmail(
    email: string,
    verificationCode: string,
  ): Promise<{ resetToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new BadRequestException('Invalid verification code');
    }

    // Find verification code token
    const verificationTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        userId: user.id,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let matchedToken: (typeof verificationTokens)[number] | null = null;

    for (const token of verificationTokens) {
      const isMatch = await bcrypt.compare(verificationCode, token.token);
      if (isMatch) {
        matchedToken = token;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Mark verification token as used
    await this.prisma.passwordResetToken.update({
      where: { id: matchedToken.id },
      data: { isUsed: true, isVerified: true },
    });

    // Generate actual password reset token (longer TTL - 1 hour)
    const resetToken = randomBytes(32).toString('hex');
    const hashedResetToken = await bcrypt.hash(resetToken, 10);

    // Create actual reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedResetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        isVerified: true, // This is the actual reset token
      },
    });

    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find all non-expired, non-used tokens and verify each one
    // Note: This still requires iterating through tokens due to bcrypt hashes,
    // but we limit to recent tokens only for performance
    const storedTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 tokens
    });

    // Find matching token using constant-time comparison
    let matchedToken: (typeof storedTokens)[number] | null = null;

    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(token, storedToken.token);
      if (isMatch) {
        matchedToken = storedToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password
    const user = await this.prisma.user.findUnique({
      where: { id: matchedToken.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: matchedToken.id },
      data: { isUsed: true },
    });

    // Revoke all refresh tokens
    await this.logoutAll(user.id);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    // Revoke all other refresh tokens for security
    // Generate new tokens for current session to avoid logout
    await this.logoutAll(userId);
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // =====================
  // EMAIL VERIFICATION
  // =====================

  private async sendVerificationEmail(user: any): Promise<void> {
    const verificationToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(verificationToken, 10);

    // Store token
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send email
    await this.emailService.sendVerificationEmail(user.email, verificationToken);
  }

  async verifyEmail(token: string): Promise<TokenResponse> {
    // Find non-expired, non-used tokens (limit to recent for performance)
    const storedTokens = await this.prisma.emailVerificationToken.findMany({
      where: {
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 tokens
    });

    // Find matching token using constant-time comparison
    let matchedToken: (typeof storedTokens)[number] | null = null;

    for (const storedToken of storedTokens) {
      const isMatch = await bcrypt.compare(token, storedToken.token);
      if (isMatch) {
        matchedToken = storedToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark email as verified
    const user = await this.prisma.user.findUnique({
      where: { id: matchedToken.userId },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    // Mark token as used
    await this.prisma.emailVerificationToken.update({
      where: { id: matchedToken.id },
      data: { isUsed: true },
    });

    // Generate and return tokens for auto-login after verification
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.sendVerificationEmail(user);
  }

  // =====================
  // USER MANAGEMENT
  // =====================

  async getMe(userId: string): Promise<any> {
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async getActiveSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      // Device information for session management
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
    }));
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid user');
    }

    return user;
  }

  // =====================
  // UTILITIES
  // =====================

  private sanitizeUser(user: any): any {
    const { passwordHash, googleId, ...sanitized } = user;
    return sanitized;
  }
}
