import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Access, AuthedRequest } from '../auth/access.js';

/** The signed-in user's admin flag and memberships, as AuthGuard loaded them */
export const CurrentAccess = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Access =>
    context.switchToHttp().getRequest<AuthedRequest>().access,
);
