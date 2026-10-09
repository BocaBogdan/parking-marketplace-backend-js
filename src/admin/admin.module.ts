import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { InviteModule } from './invite/invite.module.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [InviteModule]
})
export class AdminModule {}
