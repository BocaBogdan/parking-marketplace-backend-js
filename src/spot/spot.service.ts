import { Repository } from 'typeorm';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    // The controller checked the bytes are a PDF, so store it as one whatever the client sent
    const fileId = await this.storage.upload(`${randomUUID()}.pdf`, {
      buffer: file.buffer,
      mimetype: 'application/pdf',
    });

    try {
      return await this.spotRepository.save(
        this.spotRepository.create({
          userId,
          buildingId,
          number: createSpotDto.number,
          description: createSpotDto.description,
          lat: createSpotDto.location.lat,
          long: createSpotDto.location.long,
          underground: createSpotDto.underground ?? false,
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

  /** The user's own spot; anyone else's is reported as missing */
  async findOne(userId: string, id: string) {
    const spot = await this.spotRepository.findOneBy({ id, userId });
    if (!spot) throw new NotFoundException('Spot not found');
    return spot;
  }

  mine(userId: string) {
    return this.spotRepository.findBy({ userId });
  }

  /** The owner's view of their spot's bookings, soonest first, each with the car parked */
  async bookings(userId: string, spotId: string) {
    await this.findOne(userId, spotId);
    return this.bookingRepository.find({
      where: { spotId },
      relations: { car: true },
      order: { startsAt: 'ASC' },
    });
  }

  /** Bookable spots of the user's own building; none for a user without one */
  findAvailable(
    userId: string,
    buildingId: string | null,
    startsAt: Date,
    endsAt: Date,
  ) {
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    if (!buildingId) return [];
    return this.availableSpots(userId, buildingId, startsAt, endsAt)
      .orderBy('spot.number')
      .getMany();
  }

  async isAvailable(
    userId: string,
    buildingId: string | null,
    spotId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    if (!buildingId) return false;
    return this.availableSpots(userId, buildingId, startsAt, endsAt)
      .andWhere('spot.id = :spotId', { spotId })
      .getExists();
  }

  /**
   * Confirmed spots of the building that can be booked for the whole window (see
   * `coverageSql`: weekly schedule plus "Free now", minus "Busy") and that nobody has
   * booked for any part of it. Adjacent pieces merge, so a window can run past midnight
   * into the next day's schedule. Underground spots are included only if the user owns a
   * confirmed underground spot.
   */
  private availableSpots(
    userId: string,
    buildingId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    return this.spotRepository
      .createQueryBuilder('spot')
      .where('spot.status = :confirmed')
      .andWhere('spot."buildingId" = :buildingId')
      .andWhere(
        `(spot.underground = false OR EXISTS (
          SELECT 1 FROM spot own
          WHERE own."userId" = :userId
            AND own.underground = true
            AND own.status = :confirmed
        ))`,
      )
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
        userId,
        buildingId,
        startsAt,
        endsAt,
      });
  }

  async update(userId: string, id: string, updateSpotDto: UpdateSpotDto) {
    await this.findOne(userId, id);
    await this.spotRepository.update(
      { id, userId },
      {
        ...updateSpotDto,
        status: SpotStatus.PENDING,
        // Resubmitted for review, so the old rejection no longer applies
        rejectionReason: null,
      },
    );
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.spotRepository.delete({ id, userId });
  }
}
