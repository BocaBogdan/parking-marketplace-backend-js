import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CreateBuildingDto } from './create-building.dto.js';

/** Bounds of an invitation's validity, in days */
export const INVITE_EXPIRY_DAYS = { min: 1, max: 365 };

export class UpdateBuildingDto extends PartialType(CreateBuildingDto) {
  @ApiProperty({
    required: false,
    minimum: INVITE_EXPIRY_DAYS.min,
    maximum: INVITE_EXPIRY_DAYS.max,
    description:
      'Days an invitation link stays valid; applies to invites sent from now on',
  })
  @IsOptional()
  @IsInt()
  @Min(INVITE_EXPIRY_DAYS.min)
  @Max(INVITE_EXPIRY_DAYS.max)
  inviteExpiryDays?: number;
}
