import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
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
import { BuildingMembership } from '../membership/entities/building-membership.entity.js';
import { findOwnedSpot, ownsSpotSql } from './ownership.js';

@Injectable()
export class SpotService implements OnModuleInit {
  constructor(
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BuildingMembership)
    private readonly membershipRepository: Repository<BuildingMembership>,
    private readonly storage: StorageService,
  ) {}

  /** Spots created before co-ownership belong to their creator's apartment */
  async onModuleInit() {
    await this.spotRepository.query(
      `UPDATE spot
       SET apartment = member.apartment, "apartmentBuildingId" = member."buildingId"
       FROM building_membership member
       WHERE spot.apartment IS NULL
         AND member."userId" = spot."userId"
         AND member."buildingId" = spot."buildingId"
         AND member.apartment <> ''`,
    );
  }

  async create(
    userId: string,
    buildingId: string,
    createSpotDto: CreateSpotDto,
    file: Express.Multer.File,
  ) {
    // Shared with everyone in the creator's apartment of this building
    const membership = await this.membershipRepository.findOneBy({
      userId,
      buildingId,
    });
    const apartment = membership?.apartment || null;

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
          apartmentBuildingId: apartment && buildingId,
          apartment,
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

  /** A spot the user owns or co-owns; anyone else's is reported as missing */
  findOne(userId: string, id: string) {
    return findOwnedSpot(this.spotRepository, userId, id);
  }

  /** Spots the user created, plus those of their apartments */
  mine(userId: string) {
    return this.spotRepository
      .createQueryBuilder('spot')
      .where(ownsSpotSql('spot', ':userId'), { userId })
      .getMany();
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
          WHERE ${ownsSpotSql('own', ':userId')}
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
      { id },
      {
        ...updateSpotDto,
        status: SpotStatus.PENDING,
        // Resubmitted for review, so the old rejection no longer applies
        rejectionReason: null,
      },
    );
    return this.findOne(userId, id);
  }

  /** Co-owners can manage the spot, but only its creator can delete it */
  async remove(userId: string, id: string) {
    const spot = await this.findOne(userId, id);
    if (spot.userId !== userId) {
      throw new ForbiddenException("Only the spot's creator can delete it");
    }
    return this.spotRepository.delete({ id, userId });
  }
}
