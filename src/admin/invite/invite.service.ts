import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
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
import { Building } from '../../building/entities/building.entity.js';
import { MailService } from '../../mail/mail.service.js';

/** Clerk's own default validity */
const DEFAULT_EXPIRY_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Building admins invite residents; only an admin can make someone a building admin */
function assertCanGrant(inviterIsAdmin: boolean, invites: InviteUserDto[]) {
  if (!inviterIsAdmin && invites.some((invite) => invite.role)) {
    throw new ForbiddenException('Only an admin can invite a building admin');
  }
}

@Injectable()
export class InviteService {
  private readonly logger = new Logger(InviteService.name);

  constructor(
    @InjectRepository(BuildingInvite)
    private readonly inviteRepository: Repository<BuildingInvite>,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    private readonly userService: UserService,
    private readonly mailService: MailService,
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
    inviterIsAdmin: boolean,
    invitedBy: string,
  ) {
    assertCanGrant(inviterIsAdmin, [inviteUserDto]);
    return this.invite(buildingId, inviteUserDto, invitedBy);
  }

  // One by one: each invitee may or may not have an account already
  async generateInvites(
    buildingId: string,
    inviteUserDto: InviteUsersDto,
    inviterIsAdmin: boolean,
    invitedBy: string,
  ) {
    assertCanGrant(inviterIsAdmin, inviteUserDto.invites);
    const invites: BuildingInvite[] = [];
    for (const invite of inviteUserDto.invites) {
      invites.push(await this.invite(buildingId, invite, invitedBy));
    }
    return invites;
  }

  private async invite(
    buildingId: string,
    { email, role, apartment }: InviteUserDto,
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
    const existing = await this.findClerkUser(normalized);
    if (existing) {
      await this.join(existing, fields);
      return this.inviteRepository.save(
        this.inviteRepository.create({
          ...fields,
          status: InviteStatus.ACCEPTED,
        }),
      );
    }

    const link = await this.send(normalized, buildingId, apartment);
    return this.inviteRepository.save(
      this.inviteRepository.create({ ...fields, ...link }),
    );
  }

  /**
   * Sends a pending invite again with a fresh link, e.g. after Clerk's expired. Someone who
   * signed up meanwhile joins straight away instead. Building admins only resend residents'.
   */
  async resend(buildingId: string, inviteId: string, inviterIsAdmin: boolean) {
    const invite = await this.findPendingInvite(
      buildingId,
      inviteId,
      inviterIsAdmin,
    );
    await this.revokeAtClerk(invite.clerkInvitationId);

    const existing = await this.findClerkUser(invite.email);
    if (existing) {
      await this.join(existing, invite);
      const accepted = {
        status: InviteStatus.ACCEPTED,
        clerkInvitationId: null,
        expiresAt: null,
      };
      await this.inviteRepository.update(invite.id, accepted);
      return Object.assign(invite, accepted);
    }

    const link = await this.send(invite.email, buildingId, invite.apartment);
    // "Sent" shows when the current link went out
    const resent = { ...link, createdAt: new Date() };
    await this.inviteRepository.update(invite.id, resent);
    return Object.assign(invite, resent);
  }

  /** Cancels a pending invite: its link stops working and the email can be invited again */
  async revoke(buildingId: string, inviteId: string, inviterIsAdmin: boolean) {
    const invite = await this.findPendingInvite(
      buildingId,
      inviteId,
      inviterIsAdmin,
    );
    await this.revokeAtClerk(invite.clerkInvitationId);
    await this.inviteRepository.update(invite.id, {
      status: InviteStatus.REVOKED,
    });
  }

  private async findPendingInvite(
    buildingId: string,
    inviteId: string,
    inviterIsAdmin: boolean,
  ) {
    const invite = await this.inviteRepository.findOneBy({
      id: inviteId,
      buildingId,
      status: InviteStatus.PENDING,
    });
    if (!invite) throw new NotFoundException('Invitation not found');
    if (!inviterIsAdmin && invite.role === MembershipRole.BUILDING_ADMIN) {
      throw new ForbiddenException(
        "Only an admin can manage a building admin's invitation",
      );
    }
    return invite;
  }

  private async findClerkUser(email: string) {
    const {
      data: [existing],
    } = await clerkClient.users.getUserList({ emailAddress: [email] });
    return existing;
  }

  private async join(
    clerkUser: Awaited<ReturnType<InviteService['findClerkUser']>>,
    {
      buildingId,
      role,
      apartment,
    }: Pick<BuildingInvite, 'buildingId' | 'role' | 'apartment'>,
  ) {
    const user = await this.userService.syncFromClerk(clerkUser);
    await this.userService.addMembership({
      buildingId,
      role,
      apartment,
      userId: user.id,
    });
  }

  /**
   * Creates a Clerk invitation valid for the building's `inviteExpiryDays` and emails its
   * link; returns the invitation id and when it expires
   */
  private async send(email: string, buildingId: string, apartment: string) {
    const building = await this.buildingRepository.findOneBy({
      id: buildingId,
    });
    const expiresInDays = building?.inviteExpiryDays ?? DEFAULT_EXPIRY_DAYS;
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      expiresInDays,
      // No metadata: the invite row gives the building, role and apartment, and becomes a
      // membership when they sign up (UserService.syncFromClerk)
      redirectUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/register`,
      // Clerk's free plan can't customize its email, so we send our own
      notify: false,
    });
    try {
      if (!invitation.url) throw new Error('Clerk returned no invitation link');
      await this.mailService.sendInvite({
        to: email,
        url: invitation.url,
        idempotencyKey: `invite/${invitation.id}`,
        buildingName: building?.name,
        apartment,
        expiresInDays,
      });
    } catch (error) {
      // Nobody got the link, so don't leave a pending invite that blocks inviting again
      await clerkClient.invitations.revokeInvitation(invitation.id);
      throw error;
    }
    return {
      clerkInvitationId: invitation.id,
      expiresAt: new Date(Date.now() + expiresInDays * DAY_MS),
    };
  }

  /** An expired or already revoked invitation can't be revoked again; that's fine */
  private async revokeAtClerk(clerkInvitationId: string | null) {
    if (!clerkInvitationId) return;
    try {
      await clerkClient.invitations.revokeInvitation(clerkInvitationId);
    } catch (error) {
      this.logger.warn(
        `Clerk invitation ${clerkInvitationId} not revoked: ${String(error)}`,
      );
    }
  }
}
