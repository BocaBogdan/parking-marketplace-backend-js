import { Module } from '@nestjs/common';
import { MemberService } from './member.service.js';
import { MemberController } from './member.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipModule } from '../../membership/membership.module.js';
import { Spot } from '../../spot/entities/spot.entity.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { StorageModule } from '../../storage/storage.module.js';
import { CommunityModule } from '../../community/community.module.js';

@Module({
  imports: [
    MembershipModule,
    TypeOrmModule.forFeature([Spot, Booking]),
    StorageModule,
    CommunityModule,
  ],
  controllers: [MemberController],
  providers: [MemberService],
})
export class MemberModule {}
