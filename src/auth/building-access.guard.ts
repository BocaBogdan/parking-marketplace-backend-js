import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { canManageBuilding, type AuthedRequest } from './access.js';

/**
 * For routes with a `:buildingId` param: admins reach any building, building admins the
 * buildings where their membership makes them one. Runs after AuthGuard.
 */
@Injectable()
export class BuildingAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const buildingId = request.params.buildingId;
    if (
      request.access &&
      typeof buildingId === 'string' &&
      canManageBuilding(request.access, buildingId)
    ) {
      return true;
    }
    throw new ForbiddenException('You can only manage your own building');
  }
}
