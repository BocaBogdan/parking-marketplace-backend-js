import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LocationDto } from './location.dto.js';
import { Type } from 'class-transformer';

export class CreateSpotDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  number: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fileId: string;
}
