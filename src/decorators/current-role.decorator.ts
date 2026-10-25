import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../auth/role.js';

/** The signed-in user's role, as AuthGuard read it */
export const CurrentRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Role => {
    const request = ctx.switchToHttp().getRequest();
    return request['role'];
  },
);
