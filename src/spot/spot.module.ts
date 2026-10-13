import { Module } from '@nestjs/common';
import { SpotService } from './spot.service.js';
import { SpotController } from './spot.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Spot } from './entities/spot.entity.js';
import { ScheduleModule } from './schedule/schedule.module.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Spot]), ScheduleModule, StorageModule],
  controllers: [SpotController],
  providers: [SpotService],
  exports: [TypeOrmModule],
})
export class SpotModule {}
