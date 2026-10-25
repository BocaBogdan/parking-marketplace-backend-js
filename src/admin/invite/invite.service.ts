import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { clerkClient } from '@clerk/express';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { InviteUsersDto } from './dto/invite-users.dto.js';
import { Role } from '../../auth/role.js';
import {
  BuildingInvite,
  InviteStatus,
} from '../../membership/entities/building-invite.entity.js';
import { MembershipRole } from '../../membership/entities/building-membership.entity.js';
import { UserService } from '../../user/user.service.js';

/** Building admins invite residents; only an admin can make someone a building admin */
function assertCanGrant(inviter: Role, invites: InviteUserDto[]) {
  if (inviter !== Role.ADMIN && invites.some((invite) => invite.role)) {
    throw new ForbiddenException('Only an admin can invite a building admin');
  }
}

@Injectable()
export class InviteService {
  constructor(
    @InjectRepository(BuildingInvite)
    private readonly inviteRepository: Repository<BuildingInvite>,
    private readonly userService: UserService,
  ) {}

  findPending(buildingId: string) {
    return this.inviteRepository.find({
      where: { buildingId, status: InviteStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  generateInvite(
    buildingId: string,
    inviteUserDto: InviteUserDto,
    inviter: Role,
    invitedBy: string,
  ) {
    assertCanGrant(inviter, [inviteUserDto]);
    return this.invite(buildingId, inviteUserDto, invitedBy);
  }

  // One by one: each invitee may or may not have an account already
  async generateInvites(
    buildingId: string,
    inviteUserDto: InviteUsersDto,
    inviter: Role,
    invitedBy: string,
  ) {
    assertCanGrant(inviter, inviteUserDto.invites);
    const invites: BuildingInvite[] = [];
    for (const invite of inviteUserDto.invites) {
      invites.push(await this.invite(buildingId, invite, invitedBy));
    }
    return invites;
  }

  private async invite(
    buildingId: string,
    { email, role, apartment, eBlocUserID }: InviteUserDto,
    invitedBy: string,
  ) {
    const normalized = email.trim().toLowerCase();
    const fields = {
      buildingId,
      email: normalized,
      role:
        role === Role.BUILDING_ADMIN
          ? MembershipRole.BUILDING_ADMIN
          : MembershipRole.RESIDENT,
      apartment,
      eBlocUserID,
      invitedBy,
    };

    if (
      await this.inviteRepository.existsBy({
        buildingId,
        email: normalized,
        status: InviteStatus.PENDING,
      })
    ) {
      throw new ConflictException(`${normalized} is already invited`);
    }

    // Clerk refuses to invite an email that has an account, so add them directly
    const {
      data: [existing],
    } = await clerkClient.users.getUserList({
      emailAddress: [normalized],
    });
    if (existing) {
      const user = await this.userService.syncFromClerk(existing);
      await this.userService.addMembership({ ...fields, userId: user.id });
      return this.inviteRepository.save(
        this.inviteRepository.create({
          ...fields,
          status: InviteStatus.ACCEPTED,
        }),
      );
    }

    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: normalized,
      // TODO: guards still read the building and role from Clerk metadata; drop this
      // once they read memberships, and the invite row alone gives the building.
      publicMetadata: {
        buildingId,
        apartment,
        eBlocUserID,
        ...(role && { role }),
      },
      redirectUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/register`,
    });
    return this.inviteRepository.save(
      this.inviteRepository.create({
        ...fields,
        clerkInvitationId: invitation.id,
      }),
    );
  }
}
