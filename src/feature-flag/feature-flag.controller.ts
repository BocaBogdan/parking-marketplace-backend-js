import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
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
import { CurrentAccess } from '../decorators/current-access.decorator.js';
import { requireMemberBuilding, type Access } from '../auth/access.js';
import { CurrentFlagsQueryDto } from './dto/current-flags-query.dto.js';

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

  /**
   * Keys of the flags on in one of the user's buildings (their first by default), for
   * the app to adapt; none for a user without a building
   */
  @Get('feature-flags/current')
  current(
    @CurrentAccess() access: Access,
    @Query() { buildingId }: CurrentFlagsQueryDto,
  ) {
    if (access.memberships.length === 0) return [];
    return this.featureFlags.enabledFor(
      requireMemberBuilding(access, buildingId),
    );
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
