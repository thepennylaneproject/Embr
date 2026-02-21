import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ReportsService } from '../services/reports.service';
import { ModerationActionsService } from '../services/moderation-actions.service';
import { BlockingService } from '../services/blocking.service';
import { AppealsService } from '../services/appeals.service';
import { ContentFilterService } from '../services/content-filter.service';
import {
  CreateReportDto,
  UpdateReportDto,
  QueryReportsDto,
  CreateModerationActionDto,
  QueryModerationActionsDto,
  BlockUserDto,
  MuteUserDto,
  MuteKeywordDto,
  CreateAppealDto,
  UpdateAppealDto,
  QueryAppealsDto,
  ContentFilterDto,
  CreateContentRuleDto,
} from '../dto/safety.dto';

@Controller('safety')
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(
    private reportsService: ReportsService,
    private moderationActionsService: ModerationActionsService,
    private blockingService: BlockingService,
    private appealsService: AppealsService,
    private contentFilterService: ContentFilterService,
  ) {}

  // ============================================
  // REPORTS ENDPOINTS
  // ============================================

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  async createReport(@Req() req, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(req.user.id, dto);
  }

  @Get('reports')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getReports(@Query() query: QueryReportsDto, @Req() req) {
    return this.reportsService.getReports(query, req.user.id);
  }

  @Get('reports/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getReportById(@Param('id') id: string, @Req() req) {
    return this.reportsService.getReportById(id, req.user.id);
  }

  @Put('reports/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async updateReport(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.updateReport(id, req.user.id, dto);
  }

  @Put('reports/bulk')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async bulkUpdateReports(
    @Req() req,
    @Body() body: { reportIds: string[]; updates: UpdateReportDto },
  ) {
    return this.reportsService.bulkUpdateReports(
      body.reportIds,
      req.user.id,
      body.updates,
    );
  }

  @Get('reports/stats/queue')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getQueueStats() {
    return this.reportsService.getQueueStats();
  }

  // ============================================
  // MODERATION ACTIONS ENDPOINTS
  // ============================================

  @Post('moderation/actions')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @HttpCode(HttpStatus.CREATED)
  async createModerationAction(@Req() req, @Body() dto: CreateModerationActionDto) {
    return this.moderationActionsService.createAction(req.user.id, dto);
  }

  @Get('moderation/actions')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getModerationActions(@Query() query: QueryModerationActionsDto) {
    return this.moderationActionsService.getActions(query);
  }

  @Get('moderation/actions/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getModerationActionById(@Param('id') id: string) {
    return this.moderationActionsService.getActionById(id);
  }

  @Delete('moderation/actions/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async revokeModerationAction(
    @Param('id') id: string,
    @Req() req,
    @Body() body: { reason: string },
  ) {
    return this.moderationActionsService.revokeAction(id, req.user.id, body.reason);
  }

  @Get('moderation/users/:userId/history')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getUserModerationHistory(@Param('userId') userId: string) {
    return this.moderationActionsService.getUserHistory(userId);
  }

  @Get('moderation/users/:userId/restriction')
  async checkUserRestriction(@Param('userId') userId: string) {
    return this.moderationActionsService.checkUserRestriction(userId);
  }

  @Get('moderation/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getModerationStats(@Query('days') days?: number) {
    return this.moderationActionsService.getStats(days ? parseInt(days as any) : 30);
  }

  // ============================================
  // BLOCKING & MUTING ENDPOINTS
  // ============================================

  @Post('blocking/block')
  @HttpCode(HttpStatus.CREATED)
  async blockUser(@Req() req, @Body() dto: BlockUserDto) {
    return this.blockingService.blockUser(req.user.id, dto);
  }

  @Delete('blocking/block/:userId')
  async unblockUser(@Req() req, @Param('userId') userId: string) {
    return this.blockingService.unblockUser(req.user.id, userId);
  }

  @Get('blocking/blocked')
  async getBlockedUsers(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.blockingService.getBlockedUsers(
      req.user.id,
      page ? parseInt(page as any) : 1,
      limit ? parseInt(limit as any) : 20,
    );
  }

  @Get('blocking/check/:userId')
  async checkIfBlocked(@Req() req, @Param('userId') userId: string) {
    const blocked = await this.blockingService.isBlocked(req.user.id, userId);
    return { blocked };
  }

  @Post('muting/mute')
  @HttpCode(HttpStatus.CREATED)
  async muteUser(@Req() req, @Body() dto: MuteUserDto) {
    return this.blockingService.muteUser(req.user.id, dto);
  }

  @Delete('muting/mute/:userId')
  async unmuteUser(@Req() req, @Param('userId') userId: string) {
    return this.blockingService.unmuteUser(req.user.id, userId);
  }

  @Get('muting/muted')
  async getMutedUsers(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.blockingService.getMutedUsers(
      req.user.id,
      page ? parseInt(page as any) : 1,
      limit ? parseInt(limit as any) : 20,
    );
  }

  @Get('muting/check/:userId')
  async checkIfMuted(@Req() req, @Param('userId') userId: string) {
    const muted = await this.blockingService.isMuted(req.user.id, userId);
    return { muted };
  }

  @Post('muting/keywords')
  @HttpCode(HttpStatus.CREATED)
  async addMutedKeyword(@Req() req, @Body() dto: MuteKeywordDto) {
    return this.blockingService.addMutedKeyword(req.user.id, dto);
  }

  @Delete('muting/keywords/:keywordId')
  async removeMutedKeyword(@Req() req, @Param('keywordId') keywordId: string) {
    return this.blockingService.removeMutedKeyword(req.user.id, keywordId);
  }

  @Get('muting/keywords')
  async getMutedKeywords(@Req() req) {
    return this.blockingService.getMutedKeywords(req.user.id);
  }

  // ============================================
  // APPEALS ENDPOINTS
  // ============================================

  @Post('appeals')
  @HttpCode(HttpStatus.CREATED)
  async createAppeal(@Req() req, @Body() dto: CreateAppealDto) {
    return this.appealsService.createAppeal(req.user.id, dto);
  }

  @Get('appeals')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getAppeals(@Query() query: QueryAppealsDto) {
    return this.appealsService.getAppeals(query);
  }

  @Get('appeals/:id')
  async getAppealById(@Param('id') id: string) {
    return this.appealsService.getAppealById(id);
  }

  @Put('appeals/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async updateAppeal(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: UpdateAppealDto,
  ) {
    return this.appealsService.updateAppeal(id, req.user.id, dto);
  }

  @Get('appeals/user/my-appeals')
  async getUserAppeals(@Req() req) {
    return this.appealsService.getUserAppeals(req.user.id);
  }

  @Get('appeals/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getAppealStats(@Query('days') days?: number) {
    return this.appealsService.getStats(days ? parseInt(days as any) : 30);
  }

  // ============================================
  // CONTENT FILTERING ENDPOINTS
  // ============================================

  @Post('filter/check')
  async filterContent(@Req() req, @Body() dto: ContentFilterDto) {
    return this.contentFilterService.filterContent(dto.content, req.user.id);
  }

  @Get('filter/user-score')
  async getUserSpamScore(@Req() req) {
    const score = await this.contentFilterService.checkUserSpamScore(req.user.id);
    return { score, risk: this.getRiskLevel(score) };
  }

  @Post('filter/rules')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async createContentRule(@Body() dto: CreateContentRuleDto) {
    return this.contentFilterService.createRule(dto);
  }

  @Get('filter/rules')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getContentRules(@Query('includeDisabled') includeDisabled?: boolean) {
    return this.contentFilterService.getRules(includeDisabled === true);
  }

  @Put('filter/rules/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateContentRule(
    @Param('id') id: string,
    @Body() updates: Partial<CreateContentRuleDto>,
  ) {
    return this.contentFilterService.updateRule(id, updates);
  }

  @Delete('filter/rules/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deleteContentRule(@Param('id') id: string) {
    return this.contentFilterService.deleteRule(id);
  }

  @Get('filter/stats')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  async getFilterStats(@Query('days') days?: number) {
    return this.contentFilterService.getStats(days ? parseInt(days as any) : 30);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getRiskLevel(score: number): string {
    if (score >= 500) return 'critical';
    if (score >= 300) return 'high';
    if (score >= 150) return 'medium';
    if (score >= 50) return 'low';
    return 'none';
  }
}
