import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppUser } from '../user/entities/app-user.entity.js';
import {
  BuildingMembership,
  MembershipRole,
} from '../membership/entities/building-membership.entity.js';
import type { Access } from './access.js';

/** What invitations stored on the Clerk user before memberships moved to the database */
export interface LegacyMetadata {
  role?: string;
  buildingId?: string;
  apartment?: string;
}

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(AppUser)
    private readonly userRepository: Repository<AppUser>,
    @InjectRepository(BuildingMembership)
    private readonly membershipRepository: Repository<BuildingMembership>,
  ) {}

  /**
   * The user's admin flag and memberships. A user with no membership whose Clerk metadata
   * still names a building (invited before memberships existed, and missed by the one-off
   * sync) gets it as a membership; metadata never grants anything by itself.
   */
  async load(userId: string, legacy?: LegacyMetadata): Promise<Access> {
    const [user, memberships] = await Promise.all([
      this.userRepository.findOne({
        where: { id: userId },
        select: { id: true, isAdmin: true },
      }),
      this.findMemberships(userId),
    ]);
    if (memberships.length === 0 && legacy?.buildingId) {
      await this.membershipRepository
        .createQueryBuilder()
        .insert()
        .values({
          userId,
          buildingId: legacy.buildingId,
          role:
            legacy.role === MembershipRole.BUILDING_ADMIN
              ? MembershipRole.BUILDING_ADMIN
              : MembershipRole.RESIDENT,
          apartment: legacy.apartment ?? '',
        })
        .orIgnore()
        .execute();
      return {
        isAdmin: user?.isAdmin ?? false,
        memberships: await this.findMemberships(userId),
      };
    }
    return { isAdmin: user?.isAdmin ?? false, memberships };
  }

  private findMemberships(userId: string) {
    return this.membershipRepository.find({
      where: { userId },
      select: {
        buildingId: true,
        role: true,
        apartment: true,
        createdAt: true,
      },
      order: { createdAt: 'ASC' },
    });
  }
}
