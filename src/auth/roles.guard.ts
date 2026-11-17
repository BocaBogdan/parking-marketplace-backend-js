import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.js';
import type { AuthedRequest } from './access.js';

/** `@Roles(Role.ADMIN)`: admins only. Runs after AuthGuard, which loads `access`. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return false;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    // Building admins are per building; BuildingAccessGuard checks those
    return roles.includes(Role.ADMIN) && request.access?.isAdmin === true;
  }
}
