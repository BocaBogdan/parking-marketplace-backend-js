import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateScheduleDto {
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
