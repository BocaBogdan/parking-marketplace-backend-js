import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentBuildingId = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { buildingId: string }>();

    const auth = request.auth();

    return 'sessionClaims' in auth
      ? (auth.sessionClaims?.publicMetadata as Record<string, string>)
          ?.buildingId
      : null;
  },
);
