import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LocationDto } from './location.dto.js';
import { Transform, Type } from 'class-transformer';

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

  // No `default` in the spec: generated clients would make the field required
  @ApiProperty({ required: false, description: 'Defaults to false' })
  @IsOptional()
  // Multipart sends "true"/"false"; implicit conversion would turn "false" into true
  @Transform(({ obj }) =>
    obj.underground === undefined
      ? undefined
      : obj.underground === true || obj.underground === 'true',
  )
  @IsBoolean()
  underground?: boolean;
}
