import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CurrentFlagsQueryDto {
  @ApiProperty({
    required: false,
    description: "One of the user's buildings; defaults to their first",
  })
  @IsOptional()
  @IsUUID()
  buildingId?: string;
}
