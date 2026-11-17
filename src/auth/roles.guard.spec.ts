import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { Role } from './role.js';

const contextFor = (isAdmin: boolean) =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({ access: { isAdmin, memberships: [] } }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: vi.fn(() => [Role.ADMIN]) };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  it('lets admins through', () => {
    expect(guard.canActivate(contextFor(true))).toBe(true);
  });

  it('refuses everyone else, Clerk role or not', () => {
    expect(guard.canActivate(contextFor(false))).toBe(false);
  });
});
