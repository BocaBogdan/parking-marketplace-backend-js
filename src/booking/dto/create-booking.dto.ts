import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  spotId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  dayOfWeek: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  startMinute: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  endMinute: number;
}
