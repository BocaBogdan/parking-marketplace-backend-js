import { Module } from '@nestjs/common';
import { CarService } from './car.service.js';
import { CarController } from './car.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Car } from './entities/car.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Car])],
  controllers: [CarController],
  providers: [CarService],
})
export class CarModule {}
