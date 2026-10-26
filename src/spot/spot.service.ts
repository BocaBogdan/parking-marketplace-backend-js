import { Repository } from 'typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Spot, SpotStatus } from './entities/spot.entity.js';
import { CreateSpotDto } from './dto/create-spot.dto.js';
import { UpdateSpotDto } from './dto/update-spot.dto.js';
import { Schedule } from './schedule/entities/schedule.entity.js';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../storage/storage.service.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { TIME_ZONE } from '../common/time-zone.js';
import { coverageSql } from './override/coverage.js';

@Injectable()
export class SpotService {
  constructor(
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly storage: StorageService,
  ) {}

  async create(
    userId: string,
    buildingId: string,
    createSpotDto: CreateSpotDto,
    file: Express.Multer.File,
  ) {
    const fileId = await this.storage.upload(`${randomUUID()}.pdf`, file);

    try {
      return await this.spotRepository.save(
        this.spotRepository.create({
          userId,
          buildingId,
          number: createSpotDto.number,
          description: createSpotDto.description,
          lat: createSpotDto.location.lat,
          long: createSpotDto.location.long,
          fileId,
        }),
      );
    } catch (error) {
      await this.storage.delete(fileId); // don't leave a file nothing points to
      throw error;
    }
  }

  findAll() {
    return this.spotRepository.find();
  }

  findOne(id: string) {
    return this.spotRepository.findOneBy({ id });
  }

  mine(userId: string) {
    return this.spotRepository.findBy({ userId });
  }

  /** The spot's bookings, soonest first, each with the car parked in it */
  bookings(spotId: string) {
    return this.bookingRepository.find({
      where: { spotId },
      relations: { car: true },
      order: { startsAt: 'ASC' },
    });
  }

  findAvailable(startsAt: Date, endsAt: Date) {
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    return this.availableSpots(startsAt, endsAt)
      .orderBy('spot.number')
      .getMany();
  }

  isAvailable(spotId: string, startsAt: Date, endsAt: Date) {
    return this.availableSpots(startsAt, endsAt)
      .andWhere('spot.id = :spotId', { spotId })
      .getExists();
  }

  /**
   * Confirmed spots that can be booked for the whole window (see `coverageSql`: weekly
   * schedule plus "Free now", minus "Busy") and that nobody has booked for any part of it.
   * Adjacent pieces merge, so a window can run past midnight into the next day's schedule.
   */
  private availableSpots(startsAt: Date, endsAt: Date) {
    return this.spotRepository
      .createQueryBuilder('spot')
      .where('spot.status = :confirmed')
      .andWhere(
        `${coverageSql('spot.id', ':startsAt', ':endsAt', ':timeZone')}
          @> tstzrange(CAST(:startsAt AS timestamptz), CAST(:endsAt AS timestamptz))`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM booking
          WHERE booking."spotId" = spot.id
            AND tstzrange(booking."startsAt", booking."endsAt")
              && tstzrange(CAST(:startsAt AS timestamptz), CAST(:endsAt AS timestamptz))
        )`,
      )
      .setParameters({
        confirmed: SpotStatus.CONFIRMED,
        timeZone: TIME_ZONE,
        startsAt,
        endsAt,
      });
  }

  async update(id: string, updateSpotDto: UpdateSpotDto) {
    await this.spotRepository.update(id, {
      ...updateSpotDto,
      status: SpotStatus.PENDING,
    });
    return this.findOne(id);
  }

  remove(id: string) {
    return this.spotRepository.delete(id);
  }
}
