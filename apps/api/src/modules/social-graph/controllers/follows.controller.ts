import { 
  Controller, 
  Post, 
  Delete, 
  Get, 
  Param, 
  Body, 
  Query,
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FollowsService } from '../services/follows.service';
import { 
  FollowUserDto, 
  GetFollowersDto, 
  GetFollowingDto,
  CheckFollowDto,
  GetMutualConnectionsDto,
  BatchFollowCheckDto
} from '../dto/follow.dto';

@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  /**
   * POST /follows - Follow a user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async followUser(@Request() req, @Body() dto: FollowUserDto) {
    return this.followsService.followUser(req.user.id, dto);
  }

  /**
   * DELETE /follows/:userId - Unfollow a user
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async unfollowUser(@Request() req, @Param('userId') userId: string) {
    return this.followsService.unfollowUser(req.user.id, userId);
  }

  /**
   * GET /follows/followers/:userId - Get user's followers
   */
  @Get('followers/:userId')
  async getFollowers(
    @Param('userId') userId: string,
    @Query() dto: GetFollowersDto
  ) {
    return this.followsService.getFollowers(userId, dto);
  }

  /**
   * GET /follows/following/:userId - Get users that user is following
   */
  @Get('following/:userId')
  async getFollowing(
    @Param('userId') userId: string,
    @Query() dto: GetFollowingDto
  ) {
    return this.followsService.getFollowing(userId, dto);
  }

  /**
   * GET /follows/check - Check if user is following another user
   */
  @Get('check')
  async checkFollowStatus(@Query() dto: CheckFollowDto) {
    return this.followsService.checkFollowStatus(dto);
  }

  /**
   * POST /follows/batch-check - Batch check follow status for multiple users
   */
  @Post('batch-check')
  async batchCheckFollowStatus(@Request() req, @Body() dto: BatchFollowCheckDto) {
    return this.followsService.batchCheckFollowStatus(req.user.id, dto);
  }

  /**
   * GET /follows/mutual - Get mutual connections with another user
   */
  @Get('mutual')
  async getMutualConnections(@Request() req, @Query() dto: GetMutualConnectionsDto) {
    return this.followsService.getMutualConnections(req.user.id, dto);
  }

  /**
   * GET /follows/counts/:userId - Get follower/following counts
   */
  @Get('counts/:userId')
  async getFollowCounts(@Param('userId') userId: string) {
    return this.followsService.getFollowCounts(userId);
  }

  /**
   * GET /follows/suggestions - Get suggested users from network
   */
  @Get('suggestions')
  async getSuggestedFromNetwork(@Request() req, @Query('limit') limit?: number) {
    return this.followsService.getSuggestedFromNetwork(req.user.id, limit || 10);
  }
}
