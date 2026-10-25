import { Module } from '@nestjs/common';
import { StatsModule } from '../../stats/stats.module.js';
import { AdminStatsController } from './stats.controller.js';

@Module({
  imports: [StatsModule],
  controllers: [AdminStatsController],
})
export class AdminStatsModule {}
