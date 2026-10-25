import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const STATS_RANGES = ['30d', '90d', '12m', 'all'] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

export class StatsQueryDto {
  @ApiPropertyOptional({ enum: STATS_RANGES, default: '30d' })
  @IsOptional()
  @IsIn(STATS_RANGES)
  range?: StatsRange;
}
