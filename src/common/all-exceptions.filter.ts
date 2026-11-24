import { randomUUID } from 'node:crypto';
import {
  type ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { formatDetails, type AuditedRequest } from '../audit/audit.js';

/** Postgres error fields TypeORM copies onto QueryFailedError */
interface DatabaseError {
  code?: string;
  table?: string;
  constraint?: string;
  detail?: string;
}

/** `Key (email)=(a@b.c)` → `Key (email)=(…)`: ids stay, personal data doesn't */
const PERSONAL_KEY =
  /Key \(([^)]*(?:email|phone|plate|name)[^)]*)\)=\([^)]*\)/gi;

/**
 * Server errors get one log line to search for (id, user, request, error and database
 * fields, never query parameters) and the same `errorId` in the response, so a user's
 * screenshot leads straight to it. Client errors are answered as Nest always does.
 */
@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    const status = statusOf(exception, this);
    if (host.getType() !== 'http' || status < 500) {
      return super.catch(exception, host);
    }

    const request = host.switchToHttp().getRequest<AuditedRequest>();
    const errorId = randomUUID().slice(0, 8);
    request.errorId = errorId;

    const path = request.originalUrl.split('?')[0];
    const line = [
      `errorId=${errorId}`,
      request.userId ?? 'anonymous',
      request.method,
      path,
      status,
      describeError(exception),
    ].join(' ');
    this.logger.error(line, exception instanceof Error ? exception.stack : '');

    const body =
      exception instanceof HttpException &&
      typeof exception.getResponse() === 'object'
        ? (exception.getResponse() as object)
        : {
            statusCode: status,
            message:
              exception instanceof HttpException
                ? exception.message
                : 'Internal server error',
          };
    const adapter = this.applicationRef ?? this.httpAdapterHost!.httpAdapter;
    const response: unknown = host.getArgByIndex(1);
    if (adapter.isHeadersSent(response)) adapter.end(response);
    else adapter.reply(response, { ...body, errorId }, status);
  }
}

function statusOf(exception: unknown, filter: BaseExceptionFilter) {
  if (exception instanceof HttpException) return exception.getStatus();
  if (filter.isHttpError(exception)) return exception.statusCode;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}

/** `QueryFailedError: <message> code=23503 table=… constraint=… detail="…" cause="…"` */
export function describeError(exception: unknown) {
  if (!(exception instanceof Error)) return JSON.stringify(exception);
  const { code, table, constraint, detail } = exception as DatabaseError;
  const cause =
    exception.cause instanceof Error
      ? `${exception.cause.name}: ${exception.cause.message}`
      : undefined;
  const details = formatDetails({
    code,
    table,
    constraint,
    detail: detail?.replace(PERSONAL_KEY, 'Key ($1)=(…)'),
    cause,
  });
  return [`${exception.name}: ${exception.message}`, details]
    .filter(Boolean)
    .join(' ');
}
