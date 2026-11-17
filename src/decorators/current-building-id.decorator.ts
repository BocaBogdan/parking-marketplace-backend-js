import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  BUILDING_HEADER,
  resolveCurrentBuilding,
  type AuthedRequest,
} from '../auth/access.js';

/**
 * The building the user is acting in: the `X-Building-Id` the switcher sends (403 if they
 * aren't a member), else their oldest membership; null if they have none.
 */
export const CurrentBuildingId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers[BUILDING_HEADER];
    return resolveCurrentBuilding(
      request.access,
      typeof header === 'string' && header ? header : undefined,
    );
  },
);
