import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InviteService } from './invite.service.js';
import { InviteController } from './invite.controller.js';
import { MembershipModule } from '../../membership/membership.module.js';
import { UserModule } from '../../user/user.module.js';
import { MailModule } from '../../mail/mail.module.js';
import { Building } from '../../building/entities/building.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Building]),
    MembershipModule,
    UserModule,
    MailModule,
  ],
  controllers: [InviteController],
  providers: [InviteService],
})
export class InviteModule {}
