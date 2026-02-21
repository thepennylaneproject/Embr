import { IsNotEmpty, IsUUID, IsOptional, IsInt, Min, IsEnum } from 'class-validator';

export class FollowUserDto {
  @IsNotEmpty()
  @IsUUID()
  followingId: string;
}

export class GetFollowersDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class GetFollowingDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class CheckFollowDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  targetUserId: string;
}

export class GetMutualConnectionsDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class BatchFollowCheckDto {
  @IsNotEmpty()
  @IsUUID(undefined, { each: true })
  userIds: string[];
}
