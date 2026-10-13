import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

const ADMIN = 'ADMIN';

export const IsAdminDecorator = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { role: string }>();

    const auth = request.auth();

    const role =
      'sessionClaims' in auth
        ? (auth.sessionClaims?.publicMetadata as Record<string, string>)?.role
        : 'USER';

    return role === ADMIN;
  },
);
