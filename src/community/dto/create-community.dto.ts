import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCommunityDto {
  @ApiProperty({ example: 'Riverside' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    type: [String],
    description: 'At least two buildings, none of them already in a community',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  buildingIds: string[];
}
