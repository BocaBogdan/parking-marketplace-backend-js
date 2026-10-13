import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InviteUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  eBlocUserID: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  apartment: string;

  @IsString()
  @IsOptional()
  role: 'ADMIN'
}