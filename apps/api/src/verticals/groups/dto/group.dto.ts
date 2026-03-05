import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum GroupType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  SECRET = 'SECRET',
}

export enum GroupMemberRole {
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export class CreateGroupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rules?: string[];
}

export class GroupSearchDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}

export class UpdateMemberRoleDto {
  @IsEnum(GroupMemberRole)
  role: GroupMemberRole;
}

export class JoinRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class InviteMemberDto {
  @IsString()
  userId: string;
}
