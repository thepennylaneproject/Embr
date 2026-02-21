// apps/api/src/modules/users/users.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateProfileDto, UpdateUserSettingsDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

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

    // Update profile fields
    await this.prisma.profile.update({
      where: { id: user.profile.id },
      data: updateProfileDto,
    });

    return this.getProfile(userId);
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // TODO: Upload to S3 and get URL
    const avatarUrl = `https://example.com/avatars/${userId}/${file.filename}`;

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

    // Update settings
    await this.prisma.profile.update({
      where: { id: user.profile.id },
      data: updateSettingsDto,
    });

    return { message: 'Settings updated successfully' };
  }

  async getUserByUsername(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { profile: { username } },
      include: { profile: true, wallet: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
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
