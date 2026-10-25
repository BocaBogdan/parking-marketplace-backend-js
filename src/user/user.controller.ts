import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { Role } from '../auth/role.js';

@UseGuards(AuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  me(@CurrentUserId() userId: string) {
    return this.userService.me(userId);
  }

  /** One-off import of the residents that signed up before memberships existed */
  @Post('/sync')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  sync() {
    return this.userService.syncAll();
  }
}
