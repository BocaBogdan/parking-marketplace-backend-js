import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/** Same limit as the Cloudflare rule in front of the API */
export const RATE_LIMIT = { ttl: 10_000, limit: 100 };

/**
 * Counts signed-in users by their Clerk id, so neighbours sharing a Wi-Fi don't share a
 * limit. Everyone else is counted by IP: Render's proxy is the direct peer, so the client's
 * address comes from Cloudflare's header, or the first X-Forwarded-For entry when the
 * onrender.com URL is called directly. Those headers can be forged, but only by requests
 * without a session, which get nothing beyond a 401.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Request): Promise<string> {
    const auth = request.auth();
    if (auth.isAuthenticated) {
      const userId =
        'userId' in auth
          ? auth.userId
          : 'subject' in auth
            ? auth.subject
            : null;
      if (userId) return Promise.resolve(`user:${userId}`);
    }
    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      request.headers['cf-connecting-ip'] ??
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0] ??
      request.ip;
    return Promise.resolve(`ip:${String(ip).trim()}`);
  }
}
