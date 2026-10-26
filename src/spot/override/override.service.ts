import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  MoreThan,
  Repository,
} from 'typeorm';
import { Spot } from '../entities/spot.entity.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { OverrideType, SpotOverride } from './entities/spot-override.entity.js';
import { CreateOverrideDto } from './dto/create-override.dto.js';

/** An override must last at least one booking slot */
const MIN_LENGTH_MS = 30 * 60 * 1000;

@Injectable()
export class OverrideService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    @InjectRepository(SpotOverride)
    private readonly overrideRepository: Repository<SpotOverride>,
  ) {}

  /** The spot's override in effect now, if any (as a list, for future ones later) */
  async findActive(userId: string, spotId: string) {
    await this.ownSpot(userId, spotId);
    return this.overrideRepository.find({
      where: [
        { spotId, endsAt: IsNull() },
        { spotId, endsAt: MoreThan(new Date()) },
      ],
      order: { startsAt: 'DESC' },
    });
  }

  /**
   * Starts an override now, ending the active one. BUSY is refused while any reservation
   * overlaps it: the spot row is locked so a booking can't slip in meanwhile.
   */
  async create(userId: string, spotId: string, dto: CreateOverrideDto) {
    await this.ownSpot(userId, spotId);
    const now = new Date();
    if (dto.endsAt && dto.endsAt.getTime() < now.getTime() + MIN_LENGTH_MS) {
      throw new BadRequestException(
        'endsAt must be at least 30 minutes from now',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      await lockSpot(manager, spotId);

      if (dto.type === OverrideType.BUSY) {
        const conflict = await manager
          .getRepository(Booking)
          .createQueryBuilder('booking')
          .where('booking.spotId = :spotId', { spotId })
          .andWhere('booking.endsAt > :now', { now })
          .andWhere(dto.endsAt ? 'booking.startsAt < :endsAt' : 'TRUE', {
            endsAt: dto.endsAt,
          })
          .orderBy('booking.startsAt')
          .getOne();
        if (conflict) {
          throw new ConflictException({
            message: 'The spot is reserved during this period',
            startsAt: conflict.startsAt,
            endsAt: conflict.endsAt,
          });
        }
      }

      await endActive(manager, spotId, now);
      const repository = manager.getRepository(SpotOverride);
      return repository.save(
        repository.create({
          spotId,
          type: dto.type,
          startsAt: now,
          endsAt: dto.endsAt ?? null,
        }),
      );
    });
  }

  /** Ends the override now; existing bookings are left alone */
  async end(userId: string, spotId: string, id: string) {
    await this.ownSpot(userId, spotId);
    return this.dataSource.transaction(async (manager) => {
      await lockSpot(manager, spotId);
      const override = await manager.getRepository(SpotOverride).findOneBy({
        id,
        spotId,
      });
      const now = new Date();
      if (!override || (override.endsAt && override.endsAt <= now)) {
        throw new NotFoundException('Override not found');
      }
      await endOverride(manager, override, now);
    });
  }

  private async ownSpot(userId: string, spotId: string) {
    const spot = await this.spotRepository.findOneBy({ id: spotId });
    if (!spot || spot.userId !== userId) {
      throw new NotFoundException('Spot not found');
    }
    return spot;
  }
}

/**
 * Serializes changes to a spot's availability: overrides and bookings both take this lock
 * before checking each other.
 */
export async function lockSpot(manager: EntityManager, spotId: string) {
  await manager.query('SELECT 1 FROM spot WHERE id = $1 FOR UPDATE', [spotId]);
}

async function endActive(manager: EntityManager, spotId: string, now: Date) {
  const active = await manager.getRepository(SpotOverride).find({
    where: [
      { spotId, endsAt: IsNull() },
      { spotId, endsAt: MoreThan(now) },
    ],
  });
  for (const override of active) await endOverride(manager, override, now);
}

/** Cuts it off at `now`; one that hadn't really started yet is simply removed */
async function endOverride(
  manager: EntityManager,
  override: SpotOverride,
  now: Date,
) {
  const repository = manager.getRepository(SpotOverride);
  if (override.startsAt >= now) await repository.delete(override.id);
  else await repository.update(override.id, { endsAt: now });
}
