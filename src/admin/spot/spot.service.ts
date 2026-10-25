import { Injectable, NotFoundException } from '@nestjs/common';
import { Spot, SpotStatus } from '../../spot/entities/spot.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from '../../storage/storage.service.js';
import { Booking } from '../../booking/entities/booking.entity.js';

@Injectable()
export class AdminSpotService {
  constructor(
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
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

  /** One spot of the building with its owner and weekly schedule */
  async findOne(buildingId: string, id: string) {
    // The guard checked the building in the URL; the spot has to be in it too
    const spot = await this.spotRepository.findOne({
      where: { id, buildingId },
      relations: { owner: true, schedules: true },
    });
    if (!spot) throw new NotFoundException('Spot not found');
    return spot;
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

  async updateStatus(buildingId: string, id: string, status: SpotStatus) {
    // The guard checked the building in the URL; the spot has to be in it too
    const spot = await this.spotRepository.findOneBy({ id, buildingId });
    if (!spot) throw new NotFoundException('Spot not found');

    if (status === SpotStatus.CONFIRMED) {
      await this.storage.delete(spot.fileId);
    }
    return this.spotRepository.update(id, { status });
  }
}
