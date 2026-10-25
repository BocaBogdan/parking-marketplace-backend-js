import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  spotId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  carId: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  endsAt: Date;
}
