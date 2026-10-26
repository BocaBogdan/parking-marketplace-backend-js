import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Spot } from '../entities/spot.entity.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { SpotOverride } from './entities/spot-override.entity.js';
import { OverrideController } from './override.controller.js';
import { OverrideService } from './override.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([SpotOverride, Spot, Booking])],
  controllers: [OverrideController],
  providers: [OverrideService],
})
export class OverrideModule {}
