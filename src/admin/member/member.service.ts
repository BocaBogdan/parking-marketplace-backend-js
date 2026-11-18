import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Not, Repository } from 'typeorm';
import {
  BuildingMembership,
  MembershipRole,
} from '../../membership/entities/building-membership.entity.js';
import { Spot } from '../../spot/entities/spot.entity.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { StorageService } from '../../storage/storage.service.js';
import { CommunityService } from '../../community/community.service.js';
import type { Access } from '../../auth/access.js';

/** What removing a member changed, for the admin's confirmation */
export interface MemberRemoval {
  /** Who was removed */
  userId: string;
  /** Their spots nobody else in the apartment could take over */
  spotsDeleted: number;
  /** Their spots handed to someone still living in the apartment */
  spotsKept: number;
  /** Their upcoming bookings in buildings they no longer see */
  bookingsCancelled: number;
}

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  constructor(
    @InjectRepository(BuildingMembership)
    private readonly membershipRepository: Repository<BuildingMembership>,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly communityService: CommunityService,
  ) {}

  /** The building's residents with their name and email, earliest first */
  findByBuilding(buildingId: string) {
    return this.membershipRepository.find({
      where: { buildingId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Promotes a member to building admin or back to resident. Access is read from
   * memberships on every request, so it applies from the member's next request.
   */
  async updateRole(
    buildingId: string,
    membershipId: string,
    role: MembershipRole,
  ) {
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, buildingId },
      relations: { user: true },
    });
    if (!membership) {
      throw new NotFoundException('This member is not in this building');
    }
    if (membership.role !== role) {
      await this.membershipRepository.update(membership.id, { role });
      membership.role = role;
    }
    return membership;
  }

  /**
   * Takes the member out of the building. Admins remove anyone; building admins only
   * residents, and not themselves. Their spots there go to a flatmate who stays, or are
   * deleted with their upcoming bookings; their own upcoming bookings in buildings they
   * no longer see are cancelled. Past bookings stay. Applies from their next request.
   */
  async remove(
    buildingId: string,
    membershipId: string,
    actorId: string,
    access: Access,
  ): Promise<MemberRemoval> {
    const membership = await this.membershipRepository.findOneBy({
      id: membershipId,
      buildingId,
    });
    if (!membership) {
      throw new NotFoundException('This member is not in this building');
    }
    if (!access.isAdmin) {
      if (membership.role === MembershipRole.BUILDING_ADMIN) {
        throw new ForbiddenException(
          'Only an admin can remove a building admin',
        );
      }
      if (membership.userId === actorId) {
        throw new ForbiddenException(
          'You cannot remove yourself from the building',
        );
      }
    }
    const { userId } = membership;

    // What they still see once this membership is gone
    const others = await this.membershipRepository.find({
      where: { userId, buildingId: Not(buildingId) },
      select: { buildingId: true },
    });
    const visible = await this.communityService.visibleBuildingIds(
      others.map((other) => other.buildingId),
    );

    const now = new Date();
    const files: string[] = [];
    const removal = await this.dataSource.transaction(async (manager) => {
      let spotsDeleted = 0;
      let spotsKept = 0;
      for (const spot of await manager.findBy(Spot, { userId, buildingId })) {
        // Only the creator can delete a spot, so a flatmate who stays becomes it
        const heir =
          spot.apartment && spot.apartmentBuildingId
            ? await manager.findOne(BuildingMembership, {
                where: {
                  buildingId: spot.apartmentBuildingId,
                  apartment: spot.apartment,
                  userId: Not(userId),
                },
                order: { createdAt: 'ASC' },
              })
            : null;
        if (heir) {
          await manager.update(Spot, { id: spot.id }, { userId: heir.userId });
          spotsKept++;
        } else {
          await manager.delete(Booking, {
            spotId: spot.id,
            endsAt: MoreThan(now),
          });
          await manager.delete(Spot, { id: spot.id });
          if (spot.fileId) files.push(spot.fileId);
          spotsDeleted++;
        }
      }

      const cancel = manager
        .createQueryBuilder()
        .delete()
        .from(Booking)
        .where('"userId" = :userId', { userId })
        .andWhere('"endsAt" > :now', { now });
      if (visible.length > 0) {
        cancel.andWhere(
          `NOT EXISTS (
            SELECT 1 FROM spot
            WHERE spot.id = booking."spotId" AND spot."buildingId" IN (:...visible)
          )`,
          { visible },
        );
      }
      const { affected } = await cancel.execute();

      await manager.delete(BuildingMembership, { id: membership.id });
      return {
        userId,
        spotsDeleted,
        spotsKept,
        bookingsCancelled: affected ?? 0,
      };
    });

    // The removal stands even if storage is briefly unreachable; the files are just left over
    const deletions = await Promise.allSettled(
      files.map((file) => this.storage.delete(file)),
    );
    for (const deletion of deletions) {
      if (deletion.status === 'rejected') {
        this.logger.warn(
          `Spot document not deleted: ${String(deletion.reason)}`,
        );
      }
    }
    return removal;
  }
}
