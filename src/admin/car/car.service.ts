import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Car } from '../../car/entities/car.entity.js';
import { AdminCarQueryDto, CarSort } from './dto/car-query.dto.js';

const OWNER_NAME = `concat_ws(' ', owner."firstName", owner."lastName")`;

// Whitelisted ORDER BY expressions; the DTO only lets these keys through
const SORT_SQL: Record<CarSort, string> = {
  plate: 'car.plate',
  owner: `COALESCE(NULLIF(${OWNER_NAME}, ''), owner.email)`,
  apartment: `NULLIF(member.apartment, '')`,
  createdAt: 'car."createdAt"',
};

/** `%` and `_` in what the admin typed are literal, not wildcards */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

interface CarRow {
  id: string;
  plate: string;
  phone: string;
  description: string;
  createdAt: Date;
  userId: string;
  apartment: string;
  ownerId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

@Injectable()
export class AdminCarService {
  constructor(
    @InjectRepository(Car) private readonly carRepository: Repository<Car>,
  ) {}

  /**
   * The cars of the building's members, with their owner and apartment, one page at a
   * time. Cars belong to users, so someone in two buildings shows up in both.
   */
  async findByBuilding(buildingId: string, query: AdminCarQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sort = query.sort ?? 'plate';
    const dir = query.dir === 'desc' ? 'DESC' : 'ASC';

    const builder = this.carRepository
      .createQueryBuilder('car')
      // Memberships keep the building as a uuid
      .innerJoin(
        'building_membership',
        'member',
        'member."userId" = car."userId" AND member."buildingId" = CAST(:buildingId AS uuid)',
        { buildingId },
      )
      // Owners who haven't signed in since accounts moved to app_user have no row
      .leftJoin('app_user', 'owner', 'owner.id = car."userId"');

    const q = query.q?.trim();
    if (q) {
      const plate = q.replace(/[\s-]/g, '');
      builder.andWhere(
        `(${[
          ...(plate
            ? [`regexp_replace(car.plate, '[\\s-]', '', 'g') ILIKE :plate`]
            : []),
          'car.phone ILIKE :q',
          'car.description ILIKE :q',
          'owner.email ILIKE :q',
          `${OWNER_NAME} ILIKE :q`,
          'member.apartment ILIKE :q',
        ].join(' OR ')})`,
        { q: `%${escapeLike(q)}%`, plate: `%${escapeLike(plate)}%` },
      );
    }

    const [total, rows] = await Promise.all([
      builder.clone().getCount(),
      builder
        .select([
          'car.id AS id',
          'car.plate AS plate',
          'car.phone AS phone',
          'car.description AS description',
          'car."createdAt" AS "createdAt"',
          'car."userId" AS "userId"',
          'member.apartment AS apartment',
          'owner.id AS "ownerId"',
          'owner.email AS email',
          'owner."firstName" AS "firstName"',
          'owner."lastName" AS "lastName"',
        ])
        .addSelect(SORT_SQL[sort], 'sortkey')
        .orderBy('sortkey', dir, 'NULLS LAST')
        // Ties keep a fixed order, so no car moves between pages
        .addOrderBy('car.id', 'ASC')
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .getRawMany<CarRow>(),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        plate: row.plate,
        phone: row.phone,
        description: row.description,
        createdAt: row.createdAt,
        apartment: row.apartment,
        owner: row.ownerId
          ? {
              id: row.ownerId,
              email: row.email,
              firstName: row.firstName,
              lastName: row.lastName,
            }
          : null,
      })),
      total,
      page,
      pageSize,
    };
  }
}
