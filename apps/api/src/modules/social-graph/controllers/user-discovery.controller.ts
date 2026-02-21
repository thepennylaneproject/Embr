import { 
  Controller, 
  Get, 
  Query,
  UseGuards, 
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/guards/optional-jwt-auth.guard';
import { UserDiscoveryService } from '../services/user-discovery.service';
import { 
  SearchUsersDto, 
  GetRecommendedUsersDto, 
  GetTrendingCreatorsDto,
  SimilarUsersDto
} from '../dto/discovery.dto';

@Controller('discovery')
export class UserDiscoveryController {
  constructor(private readonly discoveryService: UserDiscoveryService) {}

  /**
   * GET /discovery/search - Search for users
   * Accessible to both authenticated and unauthenticated users
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  async searchUsers(@Request() req, @Query() dto: SearchUsersDto) {
    const userId = req.user?.id || null;
    return this.discoveryService.searchUsers(userId, dto);
  }

  /**
   * GET /discovery/recommended - Get personalized user recommendations
   * Requires authentication
   */
  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  async getRecommendedUsers(@Request() req, @Query() dto: GetRecommendedUsersDto) {
    return this.discoveryService.getRecommendedUsers(req.user.id, dto);
  }

  /**
   * GET /discovery/trending - Get trending creators
   * Accessible to both authenticated and unauthenticated users
   */
  @Get('trending')
  @UseGuards(OptionalJwtAuthGuard)
  async getTrendingCreators(@Query() dto: GetTrendingCreatorsDto) {
    return this.discoveryService.getTrendingCreators(dto);
  }

  /**
   * GET /discovery/similar - Get users similar to current user
   * Requires authentication
   */
  @Get('similar')
  @UseGuards(JwtAuthGuard)
  async getSimilarUsers(@Request() req, @Query() dto: SimilarUsersDto) {
    return this.discoveryService.getSimilarUsers(req.user.id, dto);
  }
}
