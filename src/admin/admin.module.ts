import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { InviteModule } from './invite/invite.module.js';
import { AdminSpotModule } from './spot/spot.module.js';
import { DocumentModule } from './document/document.module.js';
import { MemberModule } from './member/member.module.js';
import { AdminStatsModule } from './stats/stats.module.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [
    InviteModule,
    AdminSpotModule,
    DocumentModule,
    MemberModule,
    AdminStatsModule,
  ],
})
export class AdminModule {}
