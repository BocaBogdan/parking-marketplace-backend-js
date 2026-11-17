import { BadRequestException, ForbiddenException } from '@nestjs/common';
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

/** Whether the user may manage this building: admins anywhere, building admins in theirs */
export const canManageBuilding = (access: Access, buildingId: string) =>
  access.isAdmin ||
  access.memberships.some(
    (membership) =>
      membership.buildingId === buildingId &&
      membership.role === MembershipRole.BUILDING_ADMIN,
  );

/** Every building the user belongs to */
export const memberBuildingIds = (access: Access) =>
  access.memberships.map((membership) => membership.buildingId);

/**
 * The building an action happens in (registering a spot, reading its flags): the one
 * asked for if the user belongs to it, else their oldest.
 */
export function requireMemberBuilding(
  access: Access,
  buildingId: string | undefined,
) {
  if (buildingId) {
    if (!memberBuildingIds(access).includes(buildingId)) {
      throw new ForbiddenException('You are not a member of this building');
    }
    return buildingId;
  }
  const oldest = access.memberships[0]?.buildingId;
  if (!oldest) throw new BadRequestException('You are not in any building');
  return oldest;
}
