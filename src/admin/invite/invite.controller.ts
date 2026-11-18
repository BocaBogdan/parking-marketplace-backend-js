import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InviteService } from './invite.service.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { InviteUsersDto } from './dto/invite-users.dto.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { BuildingAccessGuard } from '../../auth/building-access.guard.js';
import { CurrentAccess } from '../../decorators/current-access.decorator.js';
import type { Access } from '../../auth/access.js';
import { CurrentUserId } from '../../decorators/current-user-id.decorator.js';
import { Audit } from '../../audit/audit.decorator.js';
import {
  InviteStatus,
  type BuildingInvite,
} from '../../membership/entities/building-invite.entity.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  /** Invitations not accepted yet */
  @Get('/')
  findPending(@Param('buildingId') buildingId: string) {
    return this.inviteService.findPending(buildingId);
  }

  @Audit('invite.send', (invite: BuildingInvite) => ({
    invite: invite.id,
    role: invite.role,
    status: invite.status,
    expiresAt: invite.expiresAt,
  }))
  @Post('/')
  inviteNewUser(
    @Param('buildingId') buildingId: string,
    @Body() payload: InviteUserDto,
    @CurrentAccess() access: Access,
    @CurrentUserId() userId: string,
  ) {
    return this.inviteService.generateInvite(
      buildingId,
      payload,
      access.isAdmin,
      userId,
    );
  }

  @Audit('invite.bulk', (invites: BuildingInvite[]) => ({
    invites: invites.length,
    joined: invites.filter((i) => i.status === InviteStatus.ACCEPTED).length,
  }))
  @Post('/bulk')
  inviteNewUsers(
    @Param('buildingId') buildingId: string,
    @Body() payload: InviteUsersDto,
    @CurrentAccess() access: Access,
    @CurrentUserId() userId: string,
  ) {
    return this.inviteService.generateInvites(
      buildingId,
      payload,
      access.isAdmin,
      userId,
    );
  }

  /** A fresh link for a pending invite, e.g. after the old one expired */
  @Audit('invite.resend', (invite: BuildingInvite) => ({
    status: invite.status,
    expiresAt: invite.expiresAt,
  }))
  @Post(':inviteId/resend')
  resend(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @CurrentAccess() access: Access,
  ) {
    return this.inviteService.resend(buildingId, inviteId, access.isAdmin);
  }

  /** Cancels a pending invite so its link stops working and the email can be invited again */
  @Audit('invite.revoke')
  @Delete(':inviteId')
  revoke(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @CurrentAccess() access: Access,
  ) {
    return this.inviteService.revoke(buildingId, inviteId, access.isAdmin);
  }
}
