import { Module } from '@nestjs/common';
import { BookingService } from './booking.service.js';
import { BookingController } from './booking.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity.js';
import { SpotModule } from '../spot/spot.module.js';
import { CommunityModule } from '../community/community.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), SpotModule, CommunityModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
