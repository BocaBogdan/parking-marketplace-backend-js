import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Role } from '../../../auth/role.js';

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

  // Admins are set by hand in Clerk, never through an invitation
  @ApiProperty({ enum: [Role.BUILDING_ADMIN], required: false })
  @IsIn([Role.BUILDING_ADMIN])
  @IsOptional()
  role?: Role.BUILDING_ADMIN;
}
