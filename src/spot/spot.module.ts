import { Module } from '@nestjs/common';
import { SpotService } from './spot.service.js';
import { SpotController } from './spot.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Spot } from './entities/spot.entity.js';
import { ScheduleModule } from './schedule/schedule.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { StatsModule } from '../stats/stats.module.js';
import { OverrideModule } from './override/override.module.js';
import { FeatureFlagModule } from '../feature-flag/feature-flag.module.js';
import { BuildingMembership } from '../membership/entities/building-membership.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Spot, Booking, BuildingMembership]),
    ScheduleModule,
    OverrideModule,
    StorageModule,
    StatsModule,
    FeatureFlagModule,
  ],
  controllers: [SpotController],
  providers: [SpotService],
  exports: [TypeOrmModule, SpotService],
})
export class SpotModule {}
