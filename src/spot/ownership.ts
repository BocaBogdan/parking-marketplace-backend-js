import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Spot } from './entities/spot.entity.js';

/**
 * SQL that holds when the user owns the spot: they created it, or they live in the
 * apartment it belongs to. Members without an apartment ('') share nothing. Arguments are
 * SQL expressions: the spot's table alias and the user's id.
 */
export function ownsSpotSql(spot: string, userId: string) {
  return `(${spot}."userId" = ${userId} OR EXISTS (
    SELECT 1 FROM building_membership member
    WHERE member."userId" = ${userId}
      AND member."buildingId" = ${spot}."apartmentBuildingId"
      AND member.apartment = ${spot}.apartment
      AND ${spot}.apartment <> ''
  ))`;
}

/** A spot the user owns; anyone else's is reported as missing */
export async function findOwnedSpot(
  spotRepository: Repository<Spot>,
  userId: string,
  spotId: string,
) {
  const spot = await spotRepository
    .createQueryBuilder('spot')
    .where('spot.id = :spotId', { spotId })
    .andWhere(ownsSpotSql('spot', ':userId'), { userId })
    .getOne();
  if (!spot) throw new NotFoundException('Spot not found');
  return spot;
}
