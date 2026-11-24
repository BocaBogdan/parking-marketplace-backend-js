import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import { describeError } from '../common/all-exceptions.filter.js';

// What invitations stored on the Clerk user before memberships moved to the database
interface LegacyMetadata {
  role?: Role;
  buildingId?: string;
  apartment?: string;
}

@Injectable()
export class UserService {
  /** Changes made while reading /user/me, next to the request audit lines */
  private readonly audit = new Logger('Audit');
  private readonly logger = new Logger('UserService');

  constructor(
    @InjectRepository(AppUser)
    private readonly userRepository: Repository<AppUser>,
    @InjectRepository(BuildingMembership)
    private readonly membershipRepository: Repository<BuildingMembership>,
    @InjectRepository(BuildingInvite)
    private readonly inviteRepository: Repository<BuildingInvite>,
  ) {}

  /**
   * The signed-in user's row, created from Clerk on their first request. Without Clerk
   * there's nothing to create it from: a 503, which the app retries.
   */
  async ensureUser(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user) return user;
    let clerkUser: ClerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (error) {
      throw new ServiceUnavailableException(
        'Your account could not be set up right now, please try again',
        { cause: error },
      );
    }
    return this.syncFromClerk(clerkUser);
  }

  /** The user with their buildings, for the frontend to decide what to show */
  async me(userId: string) {
    const user = await this.refreshProfile(await this.ensureUser(userId));
    const memberships = await this.membershipRepository.find({
      where: { userId },
      relations: { building: true },
      order: { createdAt: 'ASC' },
    });
    user.memberships = memberships;
    return user;
  }

  /**
   * Copies the name and email from Clerk, where users edit them. The app calls `me` on
   * load, so others see the change from the user's next visit. If Clerk can't be reached,
   * the stored profile is kept until the next visit.
   */
  private async refreshProfile(user: AppUser) {
    let clerkUser: ClerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(user.id);
    } catch (error) {
      this.logger.warn(
        `${user.id} profile refresh skipped ${describeError(error)}`,
      );
      return user;
    }
    const profile = {
      email:
        clerkUser.primaryEmailAddress?.emailAddress.toLowerCase() ?? user.email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    };
    if (
      profile.email === user.email &&
      profile.firstName === user.firstName &&
      profile.lastName === user.lastName
    ) {
      return user;
    }
    await this.userRepository.update(user.id, profile);
    return Object.assign(user, profile);
  }

  /**
   * Upserts a Clerk user, then gives them the memberships waiting for them: the building
   * an older invitation stored in their Clerk metadata, and pending invites to any of
   * their verified emails. Each claim is best-effort: one that fails (e.g. its building was
   * deleted) is logged and left for the next sync, and never keeps the user out.
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
        // Only the database makes admins (set app_user.isAdmin by hand); Clerk never does
        isAdmin: existing?.isAdmin ?? false,
      }),
    );
    if (!existing) this.audit.log(`${user.id} user.created`);

    if (metadata.buildingId) {
      try {
        await this.addMembership({
          userId: user.id,
          buildingId: metadata.buildingId,
          role:
            metadata.role === Role.BUILDING_ADMIN
              ? MembershipRole.BUILDING_ADMIN
              : MembershipRole.RESIDENT,
          apartment: metadata.apartment ?? '',
        });
      } catch (error) {
        this.logger.warn(
          `${user.id} legacy membership skipped building=${metadata.buildingId} ${describeError(error)}`,
        );
      }
    }

    // Only verified emails, so nobody claims an invite by typing someone else's address
    if (verifiedEmails.length) {
      const invites = await this.inviteRepository.findBy({
        email: In(verifiedEmails),
        status: InviteStatus.PENDING,
      });
      for (const invite of invites) {
        try {
          await this.addMembership({
            userId: user.id,
            buildingId: invite.buildingId,
            role: invite.role,
            apartment: invite.apartment,
          });
          await this.inviteRepository.update(invite.id, {
            status: InviteStatus.ACCEPTED,
          });
        } catch (error) {
          // Stays pending, so the next /me or sync tries again
          this.logger.warn(
            `${user.id} invite claim failed invite=${invite.id} building=${invite.buildingId} ${describeError(error)}`,
          );
          continue;
        }
        this.audit.log(
          `${user.id} invite.accepted invite=${invite.id} building=${invite.buildingId} role=${invite.role}`,
        );
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
      'userId' | 'buildingId' | 'role' | 'apartment'
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
      })
      .orIgnore()
      .execute();
  }
}
