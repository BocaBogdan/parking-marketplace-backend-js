import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  long: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lat: string;
}