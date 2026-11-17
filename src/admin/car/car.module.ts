import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Car } from '../../car/entities/car.entity.js';
import { AdminCarController } from './car.controller.js';
import { AdminCarService } from './car.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Car])],
  controllers: [AdminCarController],
  providers: [AdminCarService],
})
export class AdminCarModule {}
