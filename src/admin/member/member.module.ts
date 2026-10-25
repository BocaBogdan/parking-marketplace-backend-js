import { Module } from '@nestjs/common';
import { MemberService } from './member.service.js';
import { MemberController } from './member.controller.js';
import { MembershipModule } from '../../membership/membership.module.js';

@Module({
  imports: [MembershipModule],
  controllers: [MemberController],
  providers: [MemberService],
})
export class MemberModule {}
