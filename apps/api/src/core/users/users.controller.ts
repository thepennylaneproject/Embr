// apps/api/src/modules/users/users.controller.ts
import { Controller, Get, Patch, Body, Param, UseInterceptors, UploadedFile, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UsersService } from './users.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UpdateProfileDto, UpdateUserSettingsDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@GetUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Patch('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatar(
    @GetUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(userId, file);
  }

  @Patch('settings')
  async updateSettings(
    @GetUser('id') userId: string,
    @Body() updateSettingsDto: UpdateUserSettingsDto,
  ) {
    return this.usersService.updateSettings(userId, updateSettingsDto);
  }

  @Get(':username')
  async getUserByUsername(@Param('username') username: string) {
    return this.usersService.getUserByUsername(username);
  }

  @Delete('account')
  async deleteAccount(@GetUser('id') userId: string) {
    await this.usersService.deleteAccount(userId);
    return { message: 'Account successfully deleted' };
  }
}
