import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SpotStatus } from '../../../spot/entities/spot.entity.js';

/** An admin's decision on a spot; a rejection has to tell the owner why */
export class UpdateSpotStatusDto {
  @ApiProperty({ enum: [SpotStatus.CONFIRMED, SpotStatus.REJECTED] })
  @IsIn([SpotStatus.CONFIRMED, SpotStatus.REJECTED])
  status: SpotStatus.CONFIRMED | SpotStatus.REJECTED;

  @ApiProperty({
    required: false,
    maxLength: 500,
    description: 'Required when rejecting',
  })
  @ValidateIf((dto: UpdateSpotStatusDto) => dto.status === SpotStatus.REJECTED)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Give the owner a reason for the rejection' })
  @MaxLength(500)
  reason?: string;
}
