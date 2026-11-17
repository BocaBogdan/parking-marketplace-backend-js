import { ForbiddenException } from '@nestjs/common';
import { MembershipRole } from '../membership/entities/building-membership.entity.js';
import {
  canManageBuilding,
  resolveCurrentBuilding,
  type Access,
  type AccessMembership,
} from './access.js';

const member = (
  buildingId: string,
  role = MembershipRole.RESIDENT,
  day = 1,
): AccessMembership => ({
  buildingId,
  role,
  apartment: '1',
  createdAt: new Date(2026, 0, day),
});

const access = (memberships: AccessMembership[], isAdmin = false): Access => ({
  isAdmin,
  memberships,
});

describe('canManageBuilding', () => {
  it('lets an admin manage any building', () => {
    expect(canManageBuilding(access([], true), 'c')).toBe(true);
  });

  it('lets a building admin manage each building they admin, and only those', () => {
    const both = access([
      member('a', MembershipRole.BUILDING_ADMIN),
      member('b', MembershipRole.BUILDING_ADMIN),
    ]);
    expect(canManageBuilding(both, 'a')).toBe(true);
    expect(canManageBuilding(both, 'b')).toBe(true);
    expect(canManageBuilding(both, 'c')).toBe(false);
  });

  it('refuses a resident', () => {
    expect(canManageBuilding(access([member('b')]), 'b')).toBe(false);
  });
});

describe('resolveCurrentBuilding', () => {
  const two = access([
    member('a', MembershipRole.RESIDENT, 1),
    member('b', MembershipRole.RESIDENT, 2),
  ]);

  it('uses the building the switcher picked', () => {
    expect(resolveCurrentBuilding(two, 'b')).toBe('b');
  });

  it('refuses a building the user is not in', () => {
    expect(() => resolveCurrentBuilding(two, 'c')).toThrow(ForbiddenException);
  });

  it('defaults to the oldest membership', () => {
    expect(resolveCurrentBuilding(two, undefined)).toBe('a');
  });

  it('is null without memberships', () => {
    expect(resolveCurrentBuilding(access([]), undefined)).toBeNull();
  });
});
