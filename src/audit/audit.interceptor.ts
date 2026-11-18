import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { catchError, tap, throwError } from 'rxjs';
import { AUDIT_KEY, type AuditOptions } from './audit.decorator.js';
import type { AuditedRequest } from './audit.js';

/** Records what an `@Audit` handler did on the request, for AuditMiddleware to log */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const options = this.reflector.get<AuditOptions | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!options || context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<AuditedRequest>();

    return next.handle().pipe(
      tap((result) => {
        let details;
        try {
          details = options.describe?.(result, request);
        } catch {
          // A describer that doesn't fit the result must never fail the request
        }
        request.audit = { action: options.action, details };
      }),
      catchError((error: unknown) => {
        request.audit = { action: options.action, error: errorMessage(error) };
        return throwError(() => error);
      }),
    );
  }
}

function errorMessage(error: unknown) {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message =
      typeof response === 'object' && 'message' in response
        ? response.message
        : error.message;
    return Array.isArray(message) ? message.join('; ') : String(message);
  }
  return error instanceof Error ? error.message : String(error);
}
