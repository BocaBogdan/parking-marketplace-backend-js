import type { Request } from 'express';

/** Ids, statuses and counts only: never emails, phones, plates or names */
export type AuditDetails = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

/** What the handler did, written by AuditMiddleware once the response is sent */
export interface AuditRecord {
  action: string;
  details?: AuditDetails;
  error?: string;
}

/** A request the audit trail reads; `userId` is set by AuthGuard */
export type AuditedRequest = Request & {
  userId?: string;
  audit?: AuditRecord;
  /** Set by AllExceptionsFilter on a server error; returned to the client too */
  errorId?: string;
};

/** Keys that would put personal data in the logs; dropped even if a describer adds one */
const PERSONAL = /email|phone|plate|name/i;

/** `{ spot: 's1', ok: true }` → `spot=s1 ok=true`; undefined values are left out */
export function formatDetails(details: AuditDetails = {}) {
  return Object.entries(details)
    .filter(([key, value]) => value !== undefined && !PERSONAL.test(key))
    .map(([key, value]) => {
      const text = value instanceof Date ? value.toISOString() : String(value);
      return `${key}=${/[\s"]/.test(text) ? JSON.stringify(text) : text}`;
    })
    .join(' ');
}
