import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RenameCommunityDto {
  @ApiProperty({ example: 'Riverside' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
