import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { MembershipRole } from '../membership/entities/building-membership.entity.js';

/** One of the user's buildings and what they are there */
export interface AccessMembership {
  buildingId: string;
  role: MembershipRole;
  apartment: string;
  createdAt: Date;
}

/** What the signed-in user may do, loaded from the database by AuthGuard */
export interface Access {
  /** Manages every building (`app_user.isAdmin`) */
  isAdmin: boolean;
  /** Oldest first */
  memberships: AccessMembership[];
}

/** A request that went through AuthGuard */
export type AuthedRequest = Request & { userId: string; access: Access };

/** The header the frontend's building switcher sends */
export const BUILDING_HEADER = 'x-building-id';

/** Whether the user may manage this building: admins anywhere, building admins in theirs */
export const canManageBuilding = (access: Access, buildingId: string) =>
  access.isAdmin ||
  access.memberships.some(
    (membership) =>
      membership.buildingId === buildingId &&
      membership.role === MembershipRole.BUILDING_ADMIN,
  );

/**
 * The building the user is acting in (registering spots, searching, booking): the one the
 * switcher picked, else their oldest; null if they belong to none.
 */
export function resolveCurrentBuilding(
  access: Access,
  requested: string | undefined,
) {
  if (requested) {
    if (!access.memberships.some((m) => m.buildingId === requested)) {
      throw new ForbiddenException('You are not a member of this building');
    }
    return requested;
  }
  return access.memberships[0]?.buildingId ?? null;
}
