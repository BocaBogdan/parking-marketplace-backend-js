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

  @Post()
  create(@Body() dto: CreateCommunityDto) {
    return this.communityService.create(dto);
  }

  @Patch(':id')
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { name }: RenameCommunityDto,
  ) {
    return this.communityService.rename(id, name);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.communityService.remove(id);
  }

  @Post(':id/building/:buildingId')
  addBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ) {
    return this.communityService.addBuilding(id, buildingId);
  }

  @Delete(':id/building/:buildingId')
  removeBuilding(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
  ) {
    return this.communityService.removeBuilding(id, buildingId);
  }
}
