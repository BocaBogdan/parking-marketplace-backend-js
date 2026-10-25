import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service.js';
import { AuthGuard } from '../../auth/auth.guard.js';
import { BuildingAccessGuard } from '../../auth/building-access.guard.js';

@UseGuards(AuthGuard, BuildingAccessGuard)
@Controller('admin/:buildingId/member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  findByBuilding(@Param('buildingId') buildingId: string) {
    return this.memberService.findByBuilding(buildingId);
  }
}
