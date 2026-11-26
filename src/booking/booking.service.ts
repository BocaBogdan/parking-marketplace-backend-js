import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Booking, type SpotSummary } from './entities/booking.entity.js';
import { Spot } from '../spot/entities/spot.entity.js';
import { Building } from '../building/entities/building.entity.js';
import { Car } from '../car/entities/car.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { SpotService } from '../spot/spot.service.js';
import { lockSpot } from '../spot/override/override.service.js';

/** Postgres error code for a violated exclusion constraint (`booking_no_overlap`) */
const EXCLUSION_VIOLATION = '23P01';
/** A booking may start in the slot already under way */
const START_LEEWAY_MS = 30 * 60 * 1000;

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Spot)
    private readonly spotRepository: Repository<Spot>,
    private readonly spotService: SpotService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    userId: string,
    buildingIds: string[],
    createBookingDto: CreateBookingDto,
  ) {
    const { spotId, carId, startsAt, endsAt } = createBookingDto;
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    if (startsAt.getTime() < Date.now() - START_LEEWAY_MS) {
      throw new BadRequestException('startsAt must not be in the past');
    }
    // Only one of the user's own cars can be parked
    if (
      !(await this.dataSource
        .getRepository(Car)
        .existsBy({ id: carId, userId }))
    ) {
      throw new NotFoundException('Car not found');
    }
    try {
      // Same lock as "Busy now", so the override and this booking can't miss each other
      return await this.dataSource.transaction(async (manager) => {
        await lockSpot(manager, spotId);
        // Also refuses spots of buildings the user doesn't live in
        if (
          !(await this.spotService.isAvailable(
            userId,
            buildingIds,
            spotId,
            startsAt,
            endsAt,
          ))
        ) {
          throw new ConflictException(
            'The spot is not available for this window',
          );
        }
        const repository = manager.getRepository(Booking);
        return repository.save(
          repository.create({ userId, spotId, carId, startsAt, endsAt }),
        );
      });
    } catch (error) {
      // Someone booked an overlapping window between the check and the insert
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === EXCLUSION_VIOLATION
      ) {
        throw new ConflictException(
          'The spot is not available for this window',
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.bookingRepository.find();
  }

  /** The driver's bookings, soonest first, each with the spot they reserved */
  async mine(userId: string) {
    const bookings = await this.bookingRepository.find({
      where: { userId },
      order: { startsAt: 'ASC' },
    });
    return this.withSpots(bookings);
  }

  /** The driver's own booking; anyone else's is reported as missing */
  async findOne(userId: string, id: string) {
    const booking = await this.bookingRepository.findOneBy({ id, userId });
    if (!booking) throw new NotFoundException('Booking not found');
    const [withSpot] = await this.withSpots([booking]);
    return withSpot;
  }

  /**
   * Adds which spot each booking is for, in one query. The building comes along because
   * community spots are in buildings the driver can't look up; a deleted spot is null.
   */
  private async withSpots(bookings: Booking[]) {
    const ids = [...new Set(bookings.map((booking) => booking.spotId))];
    const spots = ids.length
      ? await this.spotRepository
          .createQueryBuilder('spot')
          .leftJoinAndMapOne(
            'spot.building',
            Building,
            'building',
            'building.id::text = spot."buildingId"',
          )
          .select([
            'spot.id',
            'spot.number',
            'spot.underground',
            'spot.description',
            'building.id',
            'building.name',
          ])
          .where('spot.id IN (:...ids)', { ids })
          .getMany()
      : [];
    const summaries = new Map<string, SpotSummary>(
      spots.map((spot) => [
        spot.id,
        {
          id: spot.id,
          number: spot.number,
          underground: spot.underground,
          description: spot.description,
          building: spot.building
            ? { id: spot.building.id, name: spot.building.name }
            : null,
        },
      ]),
    );
    for (const booking of bookings) {
      booking.spot = summaries.get(booking.spotId) ?? null;
    }
    return bookings;
  }

  /** Only the driver cancels their booking */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.bookingRepository.delete({ id, userId });
  }
}
