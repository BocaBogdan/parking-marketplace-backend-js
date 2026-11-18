import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { Role } from '../auth/role.js';
import { CommunityService } from './community.service.js';
import { CreateCommunityDto } from './dto/create-community.dto.js';
import { RenameCommunityDto } from './dto/rename-community.dto.js';
import { Audit } from '../audit/audit.decorator.js';
import type { Community } from './entities/community.entity.js';

/** Grouping buildings is up to the admin, once their building admins have agreed */
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get()
  findAll() {
    return this.communityService.findAll();
  }

  @Audit('community.create', (community: Community) => ({
    community: community.id,
    buildings: community.buildings.map((building) => building.id).join(','),
  }))
  @Post()
  create(@Body() dto: CreateCommunityDto) {
    return this.communityService.create(dto);
  }

  @Audit('community.rename')
  @Patch(':id')
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { name }: RenameCommunityDto,
  ) {
    return this.communityService.rename(id, name);
  }

  @Audit('community.delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.communityService.remove(id);
  }

  @Audit('community.addBuilding')
  @Post(':id/building/:buildingId')
  addBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ) {
    return this.communityService.addBuilding(id, buildingId);
  }

  @Audit('community.removeBuilding')
  @Delete(':id/building/:buildingId')
  removeBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ) {
    return this.communityService.removeBuilding(id, buildingId);
  }
}
