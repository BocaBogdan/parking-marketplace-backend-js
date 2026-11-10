import { Injectable, NotFoundException } from '@nestjs/common';
import { Spot, SpotStatus } from '../../spot/entities/spot.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from '../../storage/storage.service.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { BuildingMembership } from '../../membership/entities/building-membership.entity.js';

@Injectable()
export class AdminSpotService {
  constructor(
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BuildingMembership)
    private readonly membershipRepository: Repository<BuildingMembership>,
    private readonly storage: StorageService,
  ) {}

  /** Every spot of the building with its owner, by number */
  getAllByBuildingId(buildingId: string) {
    return this.spotRepository.find({
      where: { buildingId },
      relations: { owner: true },
      order: { number: 'ASC' },
    });
  }

  /** One spot of the building with its creator, co-owners and weekly schedule */
  async findOne(buildingId: string, id: string) {
    // The guard checked the building in the URL; the spot has to be in it too
    const spot = await this.spotRepository.findOne({
      where: { id, buildingId },
      relations: { owner: true, schedules: true },
    });
    if (!spot) throw new NotFoundException('Spot not found');

    // Everyone in the owning apartment, the creator included
    const coOwners =
      spot.apartment && spot.apartmentBuildingId
        ? await this.membershipRepository.find({
            where: {
              buildingId: spot.apartmentBuildingId,
              apartment: spot.apartment,
            },
            relations: { user: true },
          })
        : [];
    return { ...spot, coOwners: coOwners.map(({ user }) => user) };
  }

  /** The spot's bookings, soonest first, with the driver and the car parked */
  async bookings(buildingId: string, id: string) {
    if (!(await this.spotRepository.existsBy({ id, buildingId }))) {
      throw new NotFoundException('Spot not found');
    }
    return this.bookingRepository.find({
      where: { spotId: id },
      relations: { driver: true, car: true },
      order: { startsAt: 'ASC' },
    });
  }

  async updateStatus(
    buildingId: string,
    id: string,
    status: SpotStatus,
    reason?: string,
  ) {
    // The guard checked the building in the URL; the spot has to be in it too
    const spot = await this.spotRepository.findOneBy({ id, buildingId });
    if (!spot) throw new NotFoundException('Spot not found');

    if (status === SpotStatus.CONFIRMED && spot.fileId) {
      await this.storage.delete(spot.fileId);
    }
    return this.spotRepository.update(id, {
      status,
      // The DTO requires a reason for a rejection; approving clears an old one
      rejectionReason: status === SpotStatus.REJECTED ? (reason ?? null) : null,
    });
  }
}
