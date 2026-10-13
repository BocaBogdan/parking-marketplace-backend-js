import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  spotId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  carId: string;

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
