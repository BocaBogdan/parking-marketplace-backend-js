import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { formatDetails, type AuditedRequest } from './audit.js';

const READS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * One log line per request that changes something: who, what, result and how long, plus
 * what the handler recorded (AuditInterceptor). Also covers requests a guard refused.
 */
@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Audit');

  use(request: AuditedRequest, response: Response, next: NextFunction) {
    if (READS.has(request.method)) return next();
    const started = performance.now();
    // Ids are in the path; the query string is left out
    const path = request.originalUrl.split('?')[0];

    response.on('finish', () => {
      const { statusCode } = response;
      const ms = Math.round(performance.now() - started);
      const parts = [
        request.userId ?? 'anonymous',
        request.method,
        path,
        statusCode,
        `${ms}ms`,
      ];
      const { audit } = request;
      if (audit) {
        parts.push(audit.action);
        const details = formatDetails(audit.details);
        if (details) parts.push(details);
        if (audit.error) parts.push(`error=${JSON.stringify(audit.error)}`);
      }
      const line = parts.join(' ');
      if (statusCode >= 500) this.logger.error(line);
      else if (statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });
    next();
  }
}
