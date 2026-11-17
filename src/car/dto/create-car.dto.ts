import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { normalizePlate, PLATE_PATTERN } from '../plate.js';

export class CreateCarDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'TM54ATM',
    description: 'Spaces and dashes are removed and letters upper-cased',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePlate(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(PLATE_PATTERN, {
    message: 'The plate may only contain letters and digits',
  })
  plate: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;
}
