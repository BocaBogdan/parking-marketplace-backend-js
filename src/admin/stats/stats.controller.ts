import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard.js';
import { BuildingAccessGuard } from '../../auth/building-access.guard.js';
import { StatsService } from '../../stats/stats.service.js';
import { StatsQueryDto } from '../../stats/dto/stats-query.dto.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/stats')
export class AdminStatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  get(
    @Param('buildingId') buildingId: string,
    @Query() { range }: StatsQueryDto,
  ) {
    return this.statsService.forBuilding(buildingId, range ?? '30d');
  }
}
