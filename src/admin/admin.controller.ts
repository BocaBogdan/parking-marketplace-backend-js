import { Controller, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../decorators/roles.decorator.js';

@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
}
