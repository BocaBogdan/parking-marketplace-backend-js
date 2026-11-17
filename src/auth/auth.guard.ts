import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AccessService, type LegacyMetadata } from './access.service.js';
import type { AuthedRequest } from './access.js';

/**
 * Clerk signs the user in; what they may do comes from the database (admin flag and
 * building memberships), loaded once onto `request.access`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly accessService: AccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & Partial<AuthedRequest>>();

    const auth = request.auth();
    if (!auth.isAuthenticated) {
      throw new UnauthorizedException('Not authorized');
    }

    const userId =
      'userId' in auth ? auth.userId : 'subject' in auth ? auth.subject : null;
    if (!userId) throw new UnauthorizedException('Not authorized');

    request.userId = userId;
    // Controllers stack AuthGuard more than once; load access a single time
    if (!request.access) {
      const legacy =
        'sessionClaims' in auth
          ? (auth.sessionClaims?.publicMetadata as LegacyMetadata | undefined)
          : undefined;
      request.access = await this.accessService.load(userId, legacy);
    }
    return true;
  }
}
