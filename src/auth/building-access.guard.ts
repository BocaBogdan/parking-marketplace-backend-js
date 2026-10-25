import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { Role } from './role.js';

/**
 * For routes with a `:buildingId` param: admins reach any building, building admins only
 * their own. Runs after AuthGuard, which sets `role` and `buildingId` on the request.
 */
@Injectable()
export class BuildingAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { role: Role; buildingId?: string }>();
    const buildingId = request.params.buildingId;

    if (request.role === Role.ADMIN) return true;
    if (
      request.role === Role.BUILDING_ADMIN &&
      buildingId &&
      request.buildingId === buildingId
    ) {
      return true;
    }
    throw new ForbiddenException('You can only manage your own building');
  }
}
