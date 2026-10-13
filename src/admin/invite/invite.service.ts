import { Injectable } from '@nestjs/common';
import { InviteUserDto } from './dto/invite-user.dto';
import { clerkClient } from '@clerk/express';
import { InviteUsersDto } from './dto/invite-users.dto';

@Injectable()
export class InviteService {
  generateInvite(buildingId: string, inviteUserDto: InviteUserDto) {
    const { email, ...publicMetadata } = inviteUserDto;

    return clerkClient.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        ...publicMetadata,
        buildingId,
      },
      redirectUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/register`,
    });
  }

  generateInvites(buildingId: string, inviteUserDto: InviteUsersDto) {
    return clerkClient.invitations.createInvitationBulk(
      inviteUserDto.invites.map(({ email, ...publicMetadata }) => ({
        emailAddress: email,
        publicMetadata: {
          ...publicMetadata,
          buildingId,
        },
        redirectUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/register`,
      })),
    );
  }
}
