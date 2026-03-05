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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { GroupMembersService } from '../services/group-members.service';
import { UpdateMemberRoleDto, JoinRequestDto, InviteMemberDto } from '../dto/group.dto';

@Controller('groups/:groupId/members')
@UseGuards(JwtAuthGuard)
export class GroupMembersController {
  constructor(private readonly groupMembersService: GroupMembersService) {}

  @Get()
  async getMembers(
    @Param('groupId') groupId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.groupMembersService.getMembers(groupId, cursor, limit);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  async join(@Param('groupId') groupId: string, @Request() req, @Body() dto: JoinRequestDto) {
    return this.groupMembersService.join(groupId, req.user.id, dto.message);
  }

  @Post('leave')
  @HttpCode(HttpStatus.OK)
  async leave(@Param('groupId') groupId: string, @Request() req) {
    return this.groupMembersService.leave(groupId, req.user.id);
  }

  @Put(':userId/role')
  async updateRole(
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Request() req,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groupMembersService.updateMemberRole(groupId, req.user.id, targetUserId, dto.role);
  }

  @Delete(':userId')
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Request() req,
  ) {
    return this.groupMembersService.removeMember(groupId, req.user.id, targetUserId);
  }

  @Get('join-requests')
  async getJoinRequests(@Param('groupId') groupId: string, @Request() req) {
    return this.groupMembersService.getJoinRequests(groupId, req.user.id);
  }

  @Put('join-requests/:requestId/approve')
  async approveRequest(
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    return this.groupMembersService.approveJoinRequest(groupId, req.user.id, requestId);
  }

  @Put('join-requests/:requestId/reject')
  async rejectRequest(
    @Param('groupId') groupId: string,
    @Param('requestId') requestId: string,
    @Request() req,
  ) {
    return this.groupMembersService.rejectJoinRequest(groupId, req.user.id, requestId);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  async invite(@Param('groupId') groupId: string, @Request() req, @Body() dto: InviteMemberDto) {
    return this.groupMembersService.inviteMember(groupId, req.user.id, dto.userId);
  }

  @Post('invite/:token/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(@Param('token') token: string, @Request() req) {
    return this.groupMembersService.acceptInvite(token, req.user.id);
  }
}
