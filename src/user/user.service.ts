import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { clerkClient } from '@clerk/express';
import type { User as ClerkUser } from '@clerk/backend';
import { AppUser } from './entities/app-user.entity.js';
import {
  BuildingMembership,
  MembershipRole,
} from '../membership/entities/building-membership.entity.js';
import {
  BuildingInvite,
  InviteStatus,
} from '../membership/entities/building-invite.entity.js';
import { Role } from '../auth/role.js';

// What invitations stored on the Clerk user before memberships moved to the database
interface LegacyMetadata {
  role?: Role;
  buildingId?: string;
  apartment?: string;
  eBlocUserID?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(AppUser)
    private readonly userRepository: Repository<AppUser>,
    @InjectRepository(BuildingMembership)
    private readonly membershipRepository: Repository<BuildingMembership>,
    @InjectRepository(BuildingInvite)
    private readonly inviteRepository: Repository<BuildingInvite>,
  ) {}

  /** The signed-in user's row, created from Clerk on their first request */
  async ensureUser(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user) return user;
    return this.syncFromClerk(await clerkClient.users.getUser(userId));
  }

  /** The user with their buildings, for the frontend to decide what to show */
  async me(userId: string) {
    const user = await this.ensureUser(userId);
    const memberships = await this.membershipRepository.find({
      where: { userId },
      relations: { building: true },
      order: { createdAt: 'ASC' },
    });
    user.memberships = memberships;
    return user;
  }

  /**
   * Upserts a Clerk user, then gives them the memberships waiting for them: the building
   * an older invitation stored in their Clerk metadata, and pending invites to any of
   * their verified emails.
   */
  async syncFromClerk(clerkUser: ClerkUser) {
    const verifiedEmails = clerkUser.emailAddresses
      .filter((email) => email.verification?.status === 'verified')
      .map((email) => email.emailAddress.toLowerCase());
    const primary =
      clerkUser.primaryEmailAddress?.emailAddress.toLowerCase() ??
      verifiedEmails[0];
    const metadata = clerkUser.publicMetadata as LegacyMetadata;
    const existing = await this.userRepository.findOneBy({ id: clerkUser.id });

    const user = await this.userRepository.save(
      this.userRepository.create({
        id: clerkUser.id,
        email: primary,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        // Admins were marked in Clerk; once here, the database decides
        isAdmin: existing?.isAdmin ?? metadata.role === Role.ADMIN,
      }),
    );

    if (metadata.buildingId) {
      await this.addMembership({
        userId: user.id,
        buildingId: metadata.buildingId,
        role:
          metadata.role === Role.BUILDING_ADMIN
            ? MembershipRole.BUILDING_ADMIN
            : MembershipRole.RESIDENT,
        apartment: metadata.apartment ?? '',
        eBlocUserID: metadata.eBlocUserID ?? '',
      });
    }

    // Only verified emails, so nobody claims an invite by typing someone else's address
    if (verifiedEmails.length) {
      const invites = await this.inviteRepository.findBy({
        email: In(verifiedEmails),
        status: InviteStatus.PENDING,
      });
      for (const invite of invites) {
        await this.addMembership({
          userId: user.id,
          buildingId: invite.buildingId,
          role: invite.role,
          apartment: invite.apartment,
          eBlocUserID: invite.eBlocUserID,
        });
        await this.inviteRepository.update(invite.id, {
          status: InviteStatus.ACCEPTED,
        });
      }
    }

    return user;
  }

  /** Imports every Clerk user, e.g. residents invited before memberships existed */
  async syncAll() {
    const limit = 100;
    let synced = 0;
    for (let offset = 0; ; offset += limit) {
      const { data } = await clerkClient.users.getUserList({ limit, offset });
      for (const clerkUser of data) await this.syncFromClerk(clerkUser);
      synced += data.length;
      if (data.length < limit) return { synced };
    }
  }

  /** Keeps an existing membership as it is (role and apartment included) */
  addMembership(
    membership: Pick<
      BuildingMembership,
      'userId' | 'buildingId' | 'role' | 'apartment' | 'eBlocUserID'
    >,
  ) {
    return this.membershipRepository
      .createQueryBuilder()
      .insert()
      .values({
        userId: membership.userId,
        buildingId: membership.buildingId,
        role: membership.role,
        apartment: membership.apartment,
        eBlocUserID: membership.eBlocUserID,
      })
      .orIgnore()
      .execute();
  }
}
