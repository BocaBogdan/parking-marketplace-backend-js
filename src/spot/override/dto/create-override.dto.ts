import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';
import { OverrideType } from '../entities/spot-override.entity.js';

export class CreateOverrideDto {
  @ApiProperty({ enum: OverrideType, enumName: 'OverrideType' })
  @IsEnum(OverrideType)
  type: OverrideType;

  /** Omitted: until the owner ends it */
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;
}
