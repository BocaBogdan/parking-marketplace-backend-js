import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { InviteService } from './invite.service.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { InviteUsersDto } from './dto/invite-users.dto.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../decorators/roles.decorator.js';

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/:buildingId/invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post('/')
  inviteNewUser(
    @Param('buildingId') buildingId: string,
    @Body() payload: InviteUserDto,
  ) {
    return this.inviteService.generateInvite(buildingId, payload);
  }

  @Post('/bulk')
  inviteNewUsers(
    @Param('buildingId') buildingId: string,
    @Body() payload: InviteUsersDto,
  ) {
    return this.inviteService.generateInvites(buildingId, payload);
  }
}
