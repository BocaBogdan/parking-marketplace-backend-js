import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateSpotDto } from './create-spot.dto.js';
import { SpotStatus } from '../entities/spot.entity.js';

export class UpdateSpotDto extends PartialType(CreateSpotDto) {
  @ApiProperty({ enum: SpotStatus, required: false })
  @IsEnum(SpotStatus)
  @IsOptional()
  status: SpotStatus;
}
