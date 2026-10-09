import { ApiProperty } from '@nestjs/swagger';
import { InviteUserDto } from './invite-user.dto.js';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InviteUsersDto {
  @ApiProperty({type: InviteUserDto})
  @ValidateNested({each: true})
  @Type(() => InviteUserDto)
  invites: InviteUserDto[];
}