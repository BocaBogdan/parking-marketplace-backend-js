import { Injectable } from '@nestjs/common';
import { InviteUserDto } from './dto/invite-user.dto';
import { clerkClient } from '@clerk/express';
import { InviteUsersDto } from './dto/invite-users.dto';

@Injectable()
export class InviteService {
  generateInvite(inviteUserDto: InviteUserDto) {
    const { email, ...publicMetadata } = inviteUserDto;

    return clerkClient.invitations.createInvitation({
      emailAddress: email,
      publicMetadata,

    });
  }

  generateInvites(inviteUserDto: InviteUsersDto) {
    return clerkClient.invitations.createInvitationBulk(
      inviteUserDto.invites.map(({ email, ...publicMetadata }) => ({
        emailAddress: email,
        publicMetadata,
      })),
    );
  }
}
