import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Spot } from '../spot/entities/spot.entity.js';
import { StatsService } from './stats.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Spot])],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
