// apps/api/src/modules/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateProfileDto, UpdateUserSettingsDto } from './dto';
import { PrismaService } from '../database/prisma.service';
import { UploadService } from '../upload/upload.service';
import DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  private sanitizeString(input: string | undefined): string | undefined {
    if (!input) return input;
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Sanitize potentially dangerous fields to prevent XSS
    const sanitizedData = {
      ...updateProfileDto,
      displayName: this.sanitizeString(updateProfileDto.displayName),
      bio: this.sanitizeString(updateProfileDto.bio),
    };

    // Update profile fields
    await this.prisma.profile.update({
      where: { id: user.profile.id },
      data: sanitizedData,
    });

    return this.getProfile(userId);
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    // Upload image to S3
    const uploadResult = await this.uploadService.uploadImage(file, userId);
    const avatarUrl = uploadResult.url;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.profile.update({
      where: { id: user.profile.id },
      data: { avatarUrl },
    });

    return this.getProfile(userId);
  }

  async updateSettings(userId: string, updateSettingsDto: UpdateUserSettingsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent settings changes for suspended accounts
    if (user.suspended) {
      throw new BadRequestException('Cannot update settings while account is suspended');
    }

    // Validate state transitions

    // Moderators and admins cannot be private (enforce public visibility for platform safety)
    if (updateSettingsDto.isPrivate && (user.role === 'MODERATOR' || user.role === 'ADMIN')) {
      throw new BadRequestException('Moderators and admins must maintain public profiles');
    }

    // Creators must allow tips if they want to monetize
    if (updateSettingsDto.allowTips === false && updateSettingsDto.isCreator === true) {
      throw new BadRequestException('Creators must allow tips to receive payments');
    }

    // Update settings
    await this.prisma.profile.update({
      where: { id: user.profile.id },
      data: updateSettingsDto,
    });

    return { message: 'Settings updated successfully' };
  }

  async getUserByUsername(username: string, currentUserId?: string) {
    const user = await this.prisma.user.findFirst({
      where: { profile: { username } },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if users have blocked each other
    if (currentUserId && currentUserId !== user.id) {
      const isBlocked = await this.prisma.blockedUser.findFirst({
        where: {
          OR: [
            { blockerId: currentUserId, blockedId: user.id },
            { blockerId: user.id, blockedId: currentUserId },
          ],
        },
      });

      if (isBlocked) {
        throw new NotFoundException('User not found');
      }
    }

    // Check if profile is private and enforce access control
    if (user.profile?.isPrivate && user.id !== currentUserId) {
      // Return limited public data for private profiles viewed by non-owners
      return {
        id: user.id,
        username: user.username,
        profile: {
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          isPrivate: true,
        },
      };
    }

    return this.sanitizeUser(user);
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, googleId, ...sanitized } = user;
    return sanitized;
  }
}
