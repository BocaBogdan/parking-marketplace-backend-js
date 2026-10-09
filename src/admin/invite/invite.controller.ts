import { Body, Controller, Post } from '@nestjs/common';
import { InviteService } from './invite.service.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { InviteUsersDto } from './dto/invite-users.dto.js';

@Controller('invite')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post('/')
  inviteNewUser(@Body() payload: InviteUserDto) {
    return this.inviteService.generateInvite(payload);
  }

  @Post('/bulk')
  inviteNewUsers(@Body() payload: InviteUsersDto) {
    return this.inviteService.generateInvites(payload);
  }
}
