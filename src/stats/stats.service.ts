import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Spot } from '../spot/entities/spot.entity.js';
import { TIME_ZONE } from '../common/time-zone.js';
import type { StatsRange } from './dto/stats-query.dto.js';

const TOP_LIMIT = 25;

/** How far back each range reaches, and the timeline bucket it's shown in */
const RANGES: Record<
  Exclude<StatsRange, 'all'>,
  { days?: number; months?: number; bucket: Bucket }
> = {
  '30d': { days: 30, bucket: 'day' },
  '90d': { days: 90, bucket: 'week' },
  '12m': { months: 12, bucket: 'month' },
};
type Bucket = 'day' | 'week' | 'month';

/** Whose bookings are counted: a whole building, or one spot */
type Scope = { buildingId: string } | { spotId: string };

interface Ranked {
  bookings: number;
  minutes: number;
}

export interface SpotRow extends Ranked {
  spotId: string;
  number: number;
  /** "Ana Pop", or the email when the account has no name; null if not synced */
  ownerName: string | null;
}

export interface CarRow extends Ranked {
  carId: string;
  /** Null once the driver has removed the car */
  plate: string | null;
  description: string | null;
  driverName?: string | null;
}

export interface UtilizationRow {
  spotId: string;
  number: number;
  offeredMinutes: number;
  bookedMinutes: number;
}

/**
 * Usage statistics, all computed in SQL. A booking counts for the part of it that falls
 * inside [from, now): future bookings haven't been used yet. Days, weeks and hours are
 * Bucharest wall-clock time.
 */
@Injectable()
export class StatsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
  ) {}

  async forBuilding(buildingId: string, range: StatsRange) {
    const scope = { buildingId };
    const window = await this.window(scope, range);
    const [
      kpis,
      activeSpots,
      topSpots,
      topCars,
      timeline,
      heatmap,
      utilization,
    ] = await Promise.all([
      this.kpis(scope, window),
      this.activeSpots(buildingId),
      this.topSpots(scope, window),
      this.topCars(scope, window),
      this.timeline(scope, window),
      this.heatmap(scope, window),
      this.utilization(scope, window),
    ]);
    return {
      range: { from: window.from, to: window.to },
      kpis: { ...kpis, activeSpots },
      topSpots,
      topCars,
      timeline,
      heatmap,
      utilization,
    };
  }

  /** One spot's statistics, for its owner only. Drivers' names are left out. */
  async forOwner(userId: string, spotId: string, range: StatsRange) {
    const spot = await this.spotRepository.findOneBy({ id: spotId });
    if (!spot || spot.userId !== userId) {
      throw new NotFoundException('Spot not found');
    }

    const scope = { spotId };
    const window = await this.window(scope, range);
    const [kpis, topCars, timeline, heatmap, [utilization]] = await Promise.all(
      [
        this.kpis(scope, window),
        this.topCars(scope, window),
        this.timeline(scope, window),
        this.heatmap(scope, window),
        this.utilization(scope, window),
      ],
    );
    return {
      range: { from: window.from, to: window.to },
      kpis,
      // The owner sees the cars parked in their spot, not who drove them
      topCars: topCars.map(
        ({ carId, plate, description, bookings, minutes }) => ({
          carId,
          plate,
          description,
          bookings,
          minutes,
        }),
      ),
      timeline,
      heatmap,
      utilization: {
        offeredMinutes: utilization?.offeredMinutes ?? 0,
        bookedMinutes: utilization?.bookedMinutes ?? 0,
      },
    };
  }

  /** The instants the range covers; "all" starts at the scope's first booking */
  private async window(scope: Scope, range: StatsRange) {
    const to = new Date();
    if (range === 'all') {
      const [{ first }] = await this.query<{ first: Date | null }>(
        scope,
        `SELECT min(b."startsAt") AS first
         FROM booking b JOIN spot ON spot.id = b."spotId"
         WHERE ${scopeSql(scope)}`,
      );
      return {
        from: first && first < to ? first : to,
        to,
        bucket: 'month' as Bucket,
      };
    }

    const { days, months, bucket } = RANGES[range];
    const from = new Date(to);
    if (days) from.setUTCDate(from.getUTCDate() - days);
    if (months) from.setUTCMonth(from.getUTCMonth() - months);
    return { from, to, bucket };
  }

  private async kpis(scope: Scope, window: Window) {
    const [row] = await this.query<{
      bookings: number;
      bookedMinutes: number;
      drivers: number;
      avgBookingMinutes: number | null;
    }>(
      scope,
      `${usedCte(scope)}
       SELECT count(*)::int AS bookings,
         coalesce(sum(minutes), 0)::float8 AS "bookedMinutes",
         count(DISTINCT "userId")::int AS drivers,
         avg(extract(epoch FROM "endsAt" - "startsAt") / 60)::float8 AS "avgBookingMinutes"
       FROM used`,
      window,
    );
    return {
      bookings: row.bookings,
      bookedMinutes: Math.round(row.bookedMinutes),
      drivers: row.drivers,
      avgBookingMinutes: Math.round(row.avgBookingMinutes ?? 0),
    };
  }

  /** Approved spots whose owner has set weekly hours: the ones neighbours can book */
  private async activeSpots(buildingId: string) {
    const [{ count }] = await this.dataSource.query<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM spot
       WHERE spot."buildingId" = $1 AND spot.status = 'CONFIRMED'
         AND EXISTS (SELECT 1 FROM schedule WHERE schedule."spotId" = spot.id)`,
      [buildingId],
    );
    return count;
  }

  private async topSpots(scope: Scope, window: Window): Promise<SpotRow[]> {
    const rows = await this.query<SpotRow>(
      scope,
      `${usedCte(scope)}
       SELECT used."spotId", spot.number,
         ${nameSql('owner')} AS "ownerName",
         count(*)::int AS bookings, sum(minutes)::float8 AS minutes
       FROM used
       JOIN spot ON spot.id = used."spotId"
       LEFT JOIN app_user owner ON owner.id = spot."userId"
       GROUP BY used."spotId", spot.number, owner.id
       ORDER BY minutes DESC, bookings DESC, spot.number
       LIMIT ${TOP_LIMIT}`,
      window,
    );
    return rows.map(roundMinutes);
  }

  private async topCars(scope: Scope, window: Window): Promise<CarRow[]> {
    const rows = await this.query<CarRow>(
      scope,
      `${usedCte(scope)}
       SELECT used."carId", car.plate, car.description,
         ${nameSql('driver')} AS "driverName",
         count(*)::int AS bookings, sum(minutes)::float8 AS minutes
       FROM used
       LEFT JOIN car ON car.id = used."carId"
       LEFT JOIN app_user driver ON driver.id = used."userId"
       GROUP BY used."carId", car.id, driver.id
       ORDER BY minutes DESC, bookings DESC
       LIMIT ${TOP_LIMIT}`,
      window,
    );
    return rows.map(roundMinutes);
  }

  /**
   * Bookings and booked minutes per local day, week (from Monday) or month, by the
   * bucket each booking starts in. Every bucket of the range is listed, empty or not.
   */
  private async timeline(scope: Scope, window: Window) {
    const rows = await this.query<{
      bucketStart: string;
      bookings: number;
      minutes: number;
    }>(
      scope,
      `${usedCte(scope)}, buckets AS (
         SELECT generate_series(
           date_trunc($5, $2::timestamptz AT TIME ZONE $4),
           $3::timestamptz AT TIME ZONE $4,
           ('1 ' || $5)::interval
         ) AS bucket
       )
       SELECT to_char(buckets.bucket, 'YYYY-MM-DD') AS "bucketStart",
         count(used."spotId")::int AS bookings,
         coalesce(sum(used.minutes), 0)::float8 AS minutes
       FROM buckets
       LEFT JOIN used ON date_trunc($5, used.s AT TIME ZONE $4) = buckets.bucket
       GROUP BY buckets.bucket
       ORDER BY buckets.bucket`,
      window,
      [window.bucket],
    );
    return rows.map(roundMinutes);
  }

  /**
   * How many spots are in use on average in each weekday × hour, in local time: the
   * minutes booked in that hour slot, divided by how often the slot occurs in the range.
   */
  private async heatmap(scope: Scope, window: Window) {
    const [booked, occurrences] = await Promise.all([
      this.query<{ dayOfWeek: number; hour: number; minutes: number }>(
        scope,
        // Real hours (instants), each filed under its local weekday and hour: a repeated
        // autumn hour counts twice and the skipped spring hour never
        `${usedCte(scope)}, slots AS (
           SELECT used.s, used.e, h
           FROM used, generate_series(
             date_trunc('hour', used.s, $4),
             used.e - interval '1 microsecond',
             interval '1 hour'
           ) AS h
         )
         SELECT extract(dow FROM h AT TIME ZONE $4)::int AS "dayOfWeek",
           extract(hour FROM h AT TIME ZONE $4)::int AS hour,
           sum(extract(epoch FROM least(e, h + interval '1 hour') - greatest(s, h)) / 60)::float8
             AS minutes
         FROM slots
         GROUP BY 1, 2`,
        window,
      ),
      this.dataSource.query<
        { dayOfWeek: number; hour: number; count: number }[]
      >(
        `SELECT extract(dow FROM h AT TIME ZONE $3)::int AS "dayOfWeek",
           extract(hour FROM h AT TIME ZONE $3)::int AS hour, count(*)::int AS count
         FROM generate_series(
           date_trunc('hour', $1::timestamptz, $3),
           $2::timestamptz - interval '1 microsecond',
           interval '1 hour'
         ) AS h
         GROUP BY 1, 2`,
        [window.from, window.to, TIME_ZONE],
      ),
    ]);

    const key = (dayOfWeek: number, hour: number) => `${dayOfWeek}-${hour}`;
    const minutesOf = new Map(
      booked.map((r) => [key(r.dayOfWeek, r.hour), r.minutes]),
    );
    const countOf = new Map(
      occurrences.map((r) => [key(r.dayOfWeek, r.hour), r.count]),
    );
    return Array.from({ length: 7 * 24 }, (_, i) => {
      const dayOfWeek = Math.floor(i / 24);
      const hour = i % 24;
      const minutes = minutesOf.get(key(dayOfWeek, hour)) ?? 0;
      const count = countOf.get(key(dayOfWeek, hour)) ?? 0;
      const avgSpotsInUse = count ? minutes / (60 * count) : 0;
      return {
        dayOfWeek,
        hour,
        avgSpotsInUse: Math.round(avgSpotsInUse * 100) / 100,
      };
    });
  }

  /**
   * Booked vs offered minutes per spot. Offered time is the spot's weekly schedule laid
   * over every local day of the range. The schedule is today's, since past versions
   * aren't kept, so older ranges are an estimate.
   */
  private async utilization(
    scope: Scope,
    window: Window,
  ): Promise<UtilizationRow[]> {
    // A building lists only bookable spots; an owner sees their spot whatever its status
    const status = 'buildingId' in scope ? `AND spot.status = 'CONFIRMED'` : '';
    const rows = await this.query<UtilizationRow>(
      scope,
      `${usedCte(scope)},
       days AS (
         SELECT d FROM generate_series(
           date_trunc('day', $2::timestamptz AT TIME ZONE $4),
           $3::timestamptz AT TIME ZONE $4,
           interval '1 day'
         ) AS d
       ),
       offered AS (
         SELECT schedule."spotId",
           sum(greatest(0, extract(epoch FROM
             least((d + schedule."endMinute" * interval '1 minute') AT TIME ZONE $4, $3::timestamptz)
             - greatest((d + schedule."startMinute" * interval '1 minute') AT TIME ZONE $4, $2::timestamptz)
           ) / 60)) AS minutes
         FROM schedule
         JOIN spot ON spot.id = schedule."spotId"
         JOIN days ON schedule."dayOfWeek" = extract(dow FROM days.d)
         WHERE ${scopeSql(scope)}
         GROUP BY schedule."spotId"
       ),
       booked AS (
         SELECT "spotId", sum(minutes) AS minutes FROM used GROUP BY "spotId"
       )
       SELECT spot.id AS "spotId", spot.number,
         coalesce(offered.minutes, 0)::float8 AS "offeredMinutes",
         coalesce(booked.minutes, 0)::float8 AS "bookedMinutes"
       FROM spot
       LEFT JOIN offered ON offered."spotId" = spot.id
       LEFT JOIN booked ON booked."spotId" = spot.id
       WHERE ${scopeSql(scope)} ${status}
       ORDER BY spot.number`,
      window,
    );
    return rows.map((row) => ({
      ...row,
      offeredMinutes: Math.round(row.offeredMinutes),
      bookedMinutes: Math.round(row.bookedMinutes),
    }));
  }

  /**
   * Runs a statistics query. Parameters: $1 the building or spot id, $2 from, $3 to,
   * $4 the time zone, then any extra ones. Postgres rejects parameters a statement doesn't
   * use, so only those up to the highest one referenced are sent.
   */
  private query<T>(
    scope: Scope,
    sql: string,
    window?: Window,
    extra: unknown[] = [],
  ) {
    const id = 'buildingId' in scope ? scope.buildingId : scope.spotId;
    const all = window
      ? [id, window.from, window.to, TIME_ZONE, ...extra]
      : [id];
    const used = Math.max(
      ...[...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])),
    );
    const params = all.slice(0, used);
    return this.dataSource.query<T[]>(sql, params);
  }
}

type Window = { from: Date; to: Date; bucket: Bucket };

function scopeSql(scope: Scope) {
  return 'buildingId' in scope ? 'spot."buildingId" = $1' : 'spot.id = $1';
}

/** The scope's bookings that overlap [from, to), clipped to it, with minutes inside it */
function usedCte(scope: Scope) {
  return `WITH used AS (
    SELECT b."spotId", b."carId", b."userId", b."startsAt", b."endsAt",
      greatest(b."startsAt", $2::timestamptz) AS s,
      least(b."endsAt", $3::timestamptz) AS e,
      extract(epoch FROM least(b."endsAt", $3::timestamptz)
        - greatest(b."startsAt", $2::timestamptz)) / 60 AS minutes
    FROM booking b
    JOIN spot ON spot.id = b."spotId"
    WHERE ${scopeSql(scope)}
      AND b."startsAt" < $3::timestamptz AND b."endsAt" > $2::timestamptz
  )`;
}

/** "Ana Pop", falling back to the email when the account has no name */
function nameSql(alias: string) {
  return `coalesce(nullif(concat_ws(' ', ${alias}."firstName", ${alias}."lastName"), ''), ${alias}.email)`;
}

function roundMinutes<T extends { minutes: number }>(row: T): T {
  return { ...row, minutes: Math.round(row.minutes) };
}
