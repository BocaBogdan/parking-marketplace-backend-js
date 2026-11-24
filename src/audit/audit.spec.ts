import { EventEmitter } from 'node:events';
import { BadRequestException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { formatDetails, type AuditedRequest } from './audit.js';
import { AuditMiddleware } from './audit.middleware.js';
import { AuditInterceptor } from './audit.interceptor.js';
import { Audit } from './audit.decorator.js';

describe('formatDetails', () => {
  it('writes key=value pairs, leaving out undefined', () => {
    expect(
      formatDetails({
        spot: 's1',
        ok: true,
        n: 2,
        skip: undefined,
        none: null,
      }),
    ).toBe('spot=s1 ok=true n=2 none=null');
  });

  it('writes dates as ISO and quotes text with spaces', () => {
    expect(
      formatDetails({
        at: new Date('2026-11-20T08:00:00Z'),
        reason: 'not yours',
      }),
    ).toBe('at=2026-11-20T08:00:00.000Z reason="not yours"');
  });

  it('never writes personal data', () => {
    expect(
      formatDetails({
        email: 'a@b.c',
        phoneNumber: '07',
        plate: 'B12ABC',
        firstName: 'Ana',
        car: 'c1',
      }),
    ).toBe('car=c1');
  });
});

describe('AuditMiddleware', () => {
  const middleware = new AuditMiddleware();
  const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  const error = vi
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => {});

  beforeEach(() => vi.clearAllMocks());

  function run(request: Partial<AuditedRequest>, statusCode: number) {
    const response = Object.assign(new EventEmitter(), { statusCode });
    const next = vi.fn();
    middleware.use(request as AuditedRequest, response as never, next);
    expect(next).toHaveBeenCalled();
    response.emit('finish');
  }

  it('skips successful reads', () => {
    run({ method: 'GET', originalUrl: '/api/spot/mine' }, 200);
    expect(log).not.toHaveBeenCalled();
  });

  it('logs failed reads with the error id', () => {
    run(
      {
        method: 'GET',
        originalUrl: '/api/user/me',
        userId: 'user_1',
        errorId: 'abcd1234',
      },
      500,
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(
        /^user_1 GET \/api\/user\/me 500 \d+ms errorId=abcd1234$/,
      ),
    );
  });

  it('logs who did what, on which ids, with the result', () => {
    run(
      {
        method: 'POST',
        originalUrl: '/api/booking?x=1',
        userId: 'user_1',
        audit: { action: 'booking.create', details: { booking: 'b1' } },
      },
      201,
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(
        /^user_1 POST \/api\/booking 201 \d+ms booking\.create booking=b1$/,
      ),
    );
  });

  it('logs refused requests as anonymous warnings', () => {
    run({ method: 'POST', originalUrl: '/api/booking' }, 401);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^anonymous POST \/api\/booking 401 \d+ms$/),
    );
  });

  it('logs server errors with their message', () => {
    run(
      {
        method: 'DELETE',
        originalUrl: '/api/car/c1',
        userId: 'user_1',
        audit: { action: 'car.delete', error: 'boom' },
      },
      500,
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('car.delete error="boom"'),
    );
  });
});

describe('AuditInterceptor', () => {
  const interceptor = new AuditInterceptor(new Reflector());

  class Handlers {
    @Audit('spot.create', (spot: { id: string }, request) => ({
      spot: spot.id,
      by: request.userId,
    }))
    audited(this: void) {}

    plain(this: void) {}
  }

  function context(handler: () => void, request: Partial<AuditedRequest>) {
    return {
      getType: () => 'http',
      getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
  }

  it('records the action and its details', async () => {
    const request: Partial<AuditedRequest> = { userId: 'user_1' };
    await lastValueFrom(
      interceptor.intercept(context(Handlers.prototype.audited, request), {
        handle: () => of({ id: 's1' }),
      }),
    );
    expect(request.audit).toEqual({
      action: 'spot.create',
      details: { spot: 's1', by: 'user_1' },
    });
  });

  it('records the error and rethrows it', async () => {
    const request: Partial<AuditedRequest> = {};
    await expect(
      lastValueFrom(
        interceptor.intercept(context(Handlers.prototype.audited, request), {
          handle: () =>
            throwError(() => new BadRequestException(['a is bad', 'b too'])),
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(request.audit).toEqual({
      action: 'spot.create',
      error: 'a is bad; b too',
    });
  });

  it('records nothing for a handler without @Audit', async () => {
    const request: Partial<AuditedRequest> = {};
    await lastValueFrom(
      interceptor.intercept(context(Handlers.prototype.plain, request), {
        handle: () => of(1),
      }),
    );
    expect(request.audit).toBeUndefined();
  });

  it("doesn't fail the request when the details can't be read", async () => {
    const request: Partial<AuditedRequest> = {};
    await expect(
      lastValueFrom(
        interceptor.intercept(context(Handlers.prototype.audited, request), {
          handle: () => of(undefined),
        }),
      ),
    ).resolves.toBeUndefined();
    expect(request.audit?.action).toBe('spot.create');
  });
});
