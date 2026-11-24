import {
  type ArgumentsHost,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter, describeError } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  const error = vi
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => {});
  const adapter = {
    isHeadersSent: vi.fn(() => false),
    reply: vi.fn(),
    end: vi.fn(),
  };
  const filter = new AllExceptionsFilter(adapter as never);
  const response = {};
  let request: Record<string, unknown>;

  function host(): ArgumentsHost {
    return {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request }),
      getArgByIndex: () => response,
    } as unknown as ArgumentsHost;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    request = {
      method: 'GET',
      originalUrl: '/api/user/me?x=1',
      userId: 'user_1',
    };
  });

  it('answers client errors as Nest does, without logging', () => {
    filter.catch(new BadRequestException('bad'), host());
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      { statusCode: 400, message: 'bad', error: 'Bad Request' },
      400,
    );
    expect(error).not.toHaveBeenCalled();
    expect(request.errorId).toBeUndefined();
  });

  it('logs one line per server error and returns its id', () => {
    const failure = new QueryFailedError(
      'INSERT INTO "building_membership" ...',
      ['user_1', 'secret-param'],
      Object.assign(new Error('violates foreign key constraint'), {
        code: '23503',
        table: 'building_membership',
        constraint: 'FK_1',
        detail: 'Key (userId)=(user_1) is not present in table "app_user".',
      }),
    );
    filter.catch(failure, host());

    const errorId = request.errorId as string;
    expect(errorId).toMatch(/^[0-9a-f]{8}$/);
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      { statusCode: 500, message: 'Internal server error', errorId },
      500,
    );
    expect(error).toHaveBeenCalledTimes(1);
    const [line] = error.mock.calls[0] as [string];
    expect(line).toMatch(
      new RegExp(
        `^errorId=${errorId} user_1 GET /api/user/me 500 QueryFailedError: violates foreign key constraint code=23503 table=building_membership constraint=FK_1 detail=`,
      ),
    );
    expect(line).toContain('Key (userId)=(user_1)');
    expect(line).not.toContain('secret-param');
  });

  it('keeps the message of a deliberate 5xx and adds the id', () => {
    filter.catch(
      new ServiceUnavailableException('try again', {
        cause: new Error('Clerk down'),
      }),
      host(),
    );
    expect(adapter.reply).toHaveBeenCalledWith(
      response,
      expect.objectContaining({
        statusCode: 503,
        message: 'try again',
        errorId: request.errorId,
      }),
      503,
    );
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('cause="Error: Clerk down"'),
      expect.any(String),
    );
  });
});

describe('describeError', () => {
  it('hides personal values in database details', () => {
    const failure = Object.assign(new Error('duplicate key'), {
      code: '23505',
      detail: 'Key (email)=(a@b.c) already exists.',
    });
    expect(describeError(failure)).toBe(
      'Error: duplicate key code=23505 detail="Key (email)=(…) already exists."',
    );
  });
});
