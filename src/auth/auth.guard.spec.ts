import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import type { AccessService } from './access.service.js';
import type { Access } from './access.js';

const access: Access = { isAdmin: false, memberships: [] };

function contextFor(request: object) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

describe('AuthGuard', () => {
  const accessService = { load: vi.fn().mockResolvedValue(access) };
  const guard = new AuthGuard(accessService as unknown as AccessService);

  beforeEach(() => accessService.load.mockClear());

  it('refuses a signed-out request', async () => {
    const request = { auth: () => ({ isAuthenticated: false }) };
    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('loads access from the database, passing Clerk metadata only as legacy', async () => {
    const metadata = { role: 'ADMIN', buildingId: 'b1' };
    const request: Record<string, unknown> = {
      auth: () => ({
        isAuthenticated: true,
        userId: 'user_1',
        sessionClaims: { publicMetadata: metadata },
      }),
    };
    expect(await guard.canActivate(contextFor(request))).toBe(true);
    expect(request.userId).toBe('user_1');
    expect(request.access).toBe(access);
    expect(accessService.load).toHaveBeenCalledWith('user_1', metadata);
  });

  it('loads access once when stacked', async () => {
    const request = {
      auth: () => ({ isAuthenticated: true, userId: 'user_1' }),
    };
    await guard.canActivate(contextFor(request));
    await guard.canActivate(contextFor(request));
    expect(accessService.load).toHaveBeenCalledTimes(1);
  });
});
