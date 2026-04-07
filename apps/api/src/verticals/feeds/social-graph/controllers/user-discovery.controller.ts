import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../../core/auth/guards/optional-jwt-auth.guard';
import { UserDiscoveryService } from '../services/user-discovery.service';
import { 
  SearchUsersDto, 
  GetRecommendedUsersDto, 
  GetTrendingCreatorsDto,
  SimilarUsersDto
} from '../dto/discovery.dto';
import { RequestWithUser } from '../../../../shared/types/request-with-user';

@Controller('discovery')
export class UserDiscoveryController {
  constructor(private readonly discoveryService: UserDiscoveryService) {}

  /**
   * GET /discovery/search - Search for users
   * Accessible to both authenticated and unauthenticated users
   * Rate limited: 60 requests per 15 minutes (prevents user enumeration)
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 900000 } })
  async searchUsers(@Request() req: RequestWithUser, @Query() dto: SearchUsersDto) {
    const userId = req.user?.id || null;
    return this.discoveryService.searchUsers(userId, dto);
  }

  /**
   * GET /discovery/recommended - Get personalized user recommendations
   * Requires authentication
   * Rate limited: 30 requests per 15 minutes (per-user cache friendly)
   */
  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 900000 } })
  async getRecommendedUsers(@Request() req: RequestWithUser, @Query() dto: GetRecommendedUsersDto) {
    return this.discoveryService.getRecommendedUsers(req.user.id, dto);
  }

  /**
   * GET /discovery/trending - Get trending creators
   * Accessible to both authenticated and unauthenticated users
   * Rate limited: 30 requests per 15 minutes (cached server-side, safe limit)
   */
  @Get('trending')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 900000 } })
  async getTrendingCreators(@Request() req: RequestWithUser, @Query() dto: GetTrendingCreatorsDto) {
    const userId = req.user?.id || null;
    return this.discoveryService.getTrendingCreators(userId, dto);
  }

  /**
   * GET /discovery/similar - Get users similar to current user
   * Requires authentication
   * Rate limited: 20 requests per 15 minutes (conservative, expensive computation)
   */
  @Get('similar')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 900000 } })
  async getSimilarUsers(@Request() req: RequestWithUser, @Query() dto: SimilarUsersDto) {
    return this.discoveryService.getSimilarUsers(req.user.id, dto);
  }
}
