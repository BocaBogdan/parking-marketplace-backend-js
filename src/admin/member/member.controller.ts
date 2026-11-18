import {
  Body,
  Controller,
  Delete,
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
import { CurrentUserId } from '../../decorators/current-user-id.decorator.js';
import { CurrentAccess } from '../../decorators/current-access.decorator.js';
import type { Access } from '../../auth/access.js';
import { Audit } from '../../audit/audit.decorator.js';
import type { BuildingMembership } from '../../membership/entities/building-membership.entity.js';
import type { MemberRemoval } from './member.service.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  findByBuilding(@Param('buildingId') buildingId: string) {
    return this.memberService.findByBuilding(buildingId);
  }

  /** Makes a member building admin or resident; admins only, building admins can't */
  @Audit('member.role', (member: BuildingMembership) => ({
    user: member.userId,
    role: member.role,
  }))
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

  /** Admins remove anyone; building admins only residents, and not themselves */
  @Audit('member.remove', (removal: MemberRemoval) => ({
    removedUser: removal.userId,
    spotsDeleted: removal.spotsDeleted,
    spotsKept: removal.spotsKept,
    bookingsCancelled: removal.bookingsCancelled,
  }))
  @Delete(':membershipId')
  remove(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUserId() actorId: string,
    @CurrentAccess() access: Access,
  ) {
    return this.memberService.remove(buildingId, membershipId, actorId, access);
  }
}
