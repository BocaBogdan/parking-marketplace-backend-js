import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { userId: string; role: string }>();

    const auth = request.auth();

    if (!auth.isAuthenticated)
      throw new UnauthorizedException('Not authorized');

    const userId =
      'userId' in auth ? auth.userId : 'subject' in auth ? auth.subject : null;

    if (!userId) throw new UnauthorizedException('Not authorized');

    request['userId'] = userId;
    request['role'] =
      'sessionClaims' in auth
        ? (auth.sessionClaims?.publicMetadata as Record<string, string>)?.role
        : 'USER';

    return true;
  }
}
