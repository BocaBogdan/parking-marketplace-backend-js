import { SetMetadata } from '@nestjs/common';
import type { AuditDetails, AuditedRequest } from './audit.js';

export const AUDIT_KEY = 'audit';

export interface AuditOptions {
  action: string;
  /** Ids and counts of what happened, from the handler's result and the request */
  describe?: (result: any, request: AuditedRequest) => AuditDetails;
}

/**
 * Names the action a changing endpoint performs, for the audit line in the logs, e.g.
 * `@Audit('booking.create', (booking) => ({ booking: booking.id }))`
 */
export const Audit = (action: string, describe?: AuditOptions['describe']) =>
  SetMetadata(AUDIT_KEY, { action, describe } satisfies AuditOptions);
