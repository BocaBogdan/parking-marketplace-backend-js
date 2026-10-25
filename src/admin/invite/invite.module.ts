import { Module } from '@nestjs/common';
import { InviteService } from './invite.service.js';
import { InviteController } from './invite.controller.js';
import { MembershipModule } from '../../membership/membership.module.js';
import { UserModule } from '../../user/user.module.js';

@Module({
  imports: [MembershipModule, UserModule],
  controllers: [InviteController],
  providers: [InviteService],
})
export class InviteModule {}
