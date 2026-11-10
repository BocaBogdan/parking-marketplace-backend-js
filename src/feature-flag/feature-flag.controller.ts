import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { BuildingAccessGuard } from '../auth/building-access.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { Role } from '../auth/role.js';
import { FeatureFlagService } from './feature-flag.service.js';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto.js';
import { SetFeatureFlagDto } from './dto/set-feature-flag.dto.js';
import { CurrentBuildingId } from '../decorators/current-building-id.decorator.js';

@UseGuards(AuthGuard)
@Controller()
export class FeatureFlagController {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  @Get('feature-flags')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAll() {
    return this.featureFlags.findAll();
  }

  /** Keys of the flags on in the signed-in user's building, for the app to adapt */
  @Get('feature-flags/current')
  current(@CurrentBuildingId() buildingId: string | null) {
    return this.featureFlags.enabledFor(buildingId);
  }

  @Post('feature-flags')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateFeatureFlagDto) {
    return this.featureFlags.create(dto);
  }

  @Delete('feature-flags/:key')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('key') key: string) {
    return this.featureFlags.remove(key);
  }

  /** Every flag with whether the building has it on */
  @Get('building/:buildingId/feature-flags')
  @UseGuards(AuthGuard, BuildingAccessGuard)
  forBuilding(@Param('buildingId', ParseUUIDPipe) buildingId: string) {
    return this.featureFlags.forBuilding(buildingId);
  }

  @Put('building/:buildingId/feature-flags/:key')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  set(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('key') key: string,
    @Body() { enabled }: SetFeatureFlagDto,
  ) {
    return this.featureFlags.set(buildingId, key, enabled);
  }
}
