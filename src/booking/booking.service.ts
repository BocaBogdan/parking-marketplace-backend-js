import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity.js';
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
    private readonly spotService: SpotService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    userId: string,
    buildingId: string | null,
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
        // Also refuses spots of other buildings
        if (
          !(await this.spotService.isAvailable(
            userId,
            buildingId,
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

  mine(userId: string) {
    return this.bookingRepository.find({
      where: { userId },
      order: { startsAt: 'ASC' },
    });
  }

  /** The driver's own booking; anyone else's is reported as missing */
  async findOne(userId: string, id: string) {
    const booking = await this.bookingRepository.findOneBy({ id, userId });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  /** Only the driver cancels their booking */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.bookingRepository.delete({ id, userId });
  }
}
