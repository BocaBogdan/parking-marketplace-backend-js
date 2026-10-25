import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InviteService } from './invite.service.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { InviteUsersDto } from './dto/invite-users.dto.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { BuildingAccessGuard } from '../../auth/building-access.guard.js';
import { CurrentRole } from '../../decorators/current-role.decorator.js';
import { Role } from '../../auth/role.js';
import { CurrentUserId } from '../../decorators/current-user-id.decorator.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  /** Invitations not accepted yet */
  @Get('/')
  findPending(@Param('buildingId') buildingId: string) {
    return this.inviteService.findPending(buildingId);
  }

  @Post('/')
  inviteNewUser(
    @Param('buildingId') buildingId: string,
    @Body() payload: InviteUserDto,
    @CurrentRole() role: Role,
    @CurrentUserId() userId: string,
  ) {
    return this.inviteService.generateInvite(buildingId, payload, role, userId);
  }

  @Post('/bulk')
  inviteNewUsers(
    @Param('buildingId') buildingId: string,
    @Body() payload: InviteUsersDto,
    @CurrentRole() role: Role,
    @CurrentUserId() userId: string,
  ) {
    return this.inviteService.generateInvites(
      buildingId,
      payload,
      role,
      userId,
    );
  }
}
