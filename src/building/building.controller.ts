import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BuildingService } from './building.service.js';
import { CreateBuildingDto } from './dto/create-building.dto.js';
import { UpdateBuildingDto } from './dto/update-building.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { BuildingAccessGuard } from '../auth/building-access.guard.js';
import { Role } from '../auth/role.js';
import { Audit } from '../audit/audit.decorator.js';
import type { Building } from './entities/building.entity.js';

@UseGuards(AuthGuard)
@Controller('building')
export class BuildingController {
  constructor(private readonly buildingService: BuildingService) {}

  @Audit('building.create', (building: Building) => ({ building: building.id }))
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() createBuildingDto: CreateBuildingDto) {
    return this.buildingService.create(createBuildingDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.buildingService.findAll();
  }

  @Get(':buildingId')
  @UseGuards(AuthGuard, BuildingAccessGuard)
  findOne(@Param('buildingId') id: string) {
    return this.buildingService.findOne(id);
  }

  @Audit('building.update', (building?: Building | null) => ({
    inviteExpiryDays: building?.inviteExpiryDays,
  }))
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
  ) {
    return this.buildingService.update(id, updateBuildingDto);
  }

  @Audit('building.delete')
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.buildingService.remove(id);
  }
}
