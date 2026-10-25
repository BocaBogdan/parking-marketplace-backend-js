import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { Role } from './role.js';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { userId: string; role: Role; buildingId?: string }
      >();

    const auth = request.auth();

    if (!auth.isAuthenticated)
      throw new UnauthorizedException('Not authorized');

    const userId =
      'userId' in auth ? auth.userId : 'subject' in auth ? auth.subject : null;

    if (!userId) throw new UnauthorizedException('Not authorized');

    request['userId'] = userId;
    const metadata =
      'sessionClaims' in auth
        ? (auth.sessionClaims?.publicMetadata as
            { role?: Role; buildingId?: string } | undefined)
        : undefined;
    request['role'] = metadata?.role ?? Role.USER;
    request['buildingId'] = metadata?.buildingId;

    return true;
  }
}
