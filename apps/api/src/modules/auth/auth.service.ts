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
import { PrismaService } from '../prisma/prisma.service';

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

  async signUp(signUpDto: SignUpDto): Promise<TokenResponse> {
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

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

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

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
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
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

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

  private async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '15m',
    });

    const refreshTokenValue = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
    });

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
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

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Store token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Send email
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find all non-expired, non-used tokens
    const storedTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    // Find matching token
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
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
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
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });

    // Revoke all refresh tokens except current session
    // (In production, you'd want to keep current session)
    await this.logoutAll(userId);
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

  async verifyEmail(token: string): Promise<void> {
    // Find all non-expired, non-used tokens
    const storedTokens = await this.prisma.emailVerificationToken.findMany({
      where: {
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
    });

    // Find matching token
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
