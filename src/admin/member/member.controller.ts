import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { MemberService } from './member.service.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { BuildingAccessGuard } from '../../auth/building-access.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../decorators/roles.decorator.js';
import { Role } from '../../auth/role.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  findByBuilding(@Param('buildingId') buildingId: string) {
    return this.memberService.findByBuilding(buildingId);
  }

  /** Makes a member building admin or resident; admins only, building admins can't */
  @Patch(':membershipId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateRole(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() { role }: UpdateMemberRoleDto,
  ) {
    return this.memberService.updateRole(buildingId, membershipId, role);
  }
}
