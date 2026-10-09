import { Module } from '@nestjs/common';
import { InviteService } from './invite.service.js';
import { InviteController } from './invite.controller.js';

@Module({
  controllers: [InviteController],
  providers: [InviteService],
})
export class InviteModule {}
