import type { Request } from 'express';
import { UserThrottlerGuard } from './user-throttler.guard.js';

describe('UserThrottlerGuard', () => {
  // getTracker uses no injected dependencies
  const guard = Object.create(UserThrottlerGuard.prototype) as {
    getTracker(request: Request): Promise<string>;
  };
  const signedOut = () => ({ isAuthenticated: false });

  function request(
    headers: Record<string, string | string[]>,
    auth: () => object = signedOut,
  ) {
    return { headers, auth, ip: '10.0.0.1' } as unknown as Request;
  }

  it('counts a signed-in user by their id, whatever their IP', async () => {
    const auth = () => ({ isAuthenticated: true, userId: 'user_1' });
    await expect(
      guard.getTracker(request({ 'cf-connecting-ip': '1.1.1.1' }, auth)),
    ).resolves.toBe('user:user_1');
  });

  it("counts everyone else by Cloudflare's client IP", async () => {
    await expect(
      guard.getTracker(
        request({
          'cf-connecting-ip': '1.1.1.1',
          'x-forwarded-for': '2.2.2.2',
        }),
      ),
    ).resolves.toBe('ip:1.1.1.1');
  });

  it('falls back to the first forwarded address, not the proxy', async () => {
    await expect(
      guard.getTracker(request({ 'x-forwarded-for': '2.2.2.2, 10.0.0.5' })),
    ).resolves.toBe('ip:2.2.2.2');
  });

  it('uses the direct peer without proxy headers', async () => {
    await expect(guard.getTracker(request({}))).resolves.toBe('ip:10.0.0.1');
  });
});
