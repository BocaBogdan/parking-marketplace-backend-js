import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AdminModule } from './admin/admin.module.js';
import { SpotModule } from './spot/spot.module.js';
import { BuildingModule } from './building/building.module.js';
import { BookingModule } from './booking/booking.module.js';
import { CarModule } from './car/car.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AdminModule, SpotModule, BuildingModule, BookingModule, CarModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
