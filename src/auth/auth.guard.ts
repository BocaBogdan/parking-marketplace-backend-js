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
      .getRequest<Request & { userId: string }>();

    const auth = request.auth();

    console.log(request)
    console.log({auth})

    if (!auth.isAuthenticated) throw new UnauthorizedException('Not authorized');

    const userId =
      'userId' in auth ? auth.userId : 'subject' in auth ? auth.subject : null;

    if (!userId) throw new UnauthorizedException('Not authorized');

    request['userId'] = userId;

    return true;
  }
}
