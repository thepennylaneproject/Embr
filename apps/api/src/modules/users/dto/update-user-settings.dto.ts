// apps/api/src/modules/users/dto/update-user-settings.dto.ts
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';

enum NotificationPreference {
  ALL = 'all',
  MENTIONS = 'mentions',
  NONE = 'none',
}

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  isCreator?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsBoolean()
  allowTips?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsEnum(NotificationPreference)
  notificationPreference?: NotificationPreference;
}
