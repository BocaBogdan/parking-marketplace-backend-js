import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SpotService } from './spot.service.js';
import { CreateSpotDto } from './dto/create-spot.dto.js';
import { UpdateSpotDto } from './dto/update-spot.dto.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CurrentAccess } from '../decorators/current-access.decorator.js';
import {
  memberBuildingIds,
  requireMemberBuilding,
  type Access,
} from '../auth/access.js';
import { CommunityService } from '../community/community.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import { StatsService } from '../stats/stats.service.js';
import { StatsQueryDto } from '../stats/dto/stats-query.dto.js';
import { Audit } from '../audit/audit.decorator.js';
import type { Spot } from './entities/spot.entity.js';

/** Same limit as the frontend's document picker */
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

@UseGuards(AuthGuard)
@Controller('spot')
export class SpotController {
  constructor(
    private readonly spotService: SpotService,
    private readonly statsService: StatsService,
    private readonly communityService: CommunityService,
  ) {}

  @Audit('spot.create', (spot: Spot) => ({
    spot: spot.id,
    building: spot.buildingId,
    status: spot.status,
    underground: spot.underground,
  }))
  @Post()
  // Multer stops reading past the limit, so an oversized upload never fills the memory
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  create(
    @CurrentUserId() userId: string,
    @CurrentAccess() access: Access,
    @Body() createSpotDto: CreateSpotDto,
    // Required and checked in the service, as it depends on the building's flags
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.spotService.create(
      userId,
      requireMemberBuilding(access, createSpotDto.buildingId),
      createSpotDto,
      file,
    );
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.spotService.findAll();
  }

  @Get('/available')
  async findAvailable(
    @CurrentUserId() userId: string,
    @CurrentAccess() access: Access,
    @Query() { startsAt, endsAt }: AvailabilityQueryDto,
  ) {
    // Every building the user lives in plus their communities; each spot says which it's in
    return this.spotService.findAvailable(
      userId,
      await this.communityService.visibleBuildingIds(memberBuildingIds(access)),
      startsAt,
      endsAt,
    );
  }

  @Get('/mine')
  mine(@CurrentUserId() userId: string) {
    return this.spotService.mine(userId);
  }

  /** The owner's own spot; 404 for anyone else */
  @Get(':id')
  findOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.spotService.findOne(userId, id);
  }

  /** Bookings of the owner's spot, with car plates and phones; 404 for anyone else */
  @Get(':id/booking')
  booking(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.spotService.bookings(userId, id);
  }

  /** The owner's statistics for one of their spots; 404 for anyone else */
  @Get(':id/stats')
  stats(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query() { range }: StatsQueryDto,
  ) {
    return this.statsService.forOwner(userId, id, range ?? '30d');
  }

  @Audit('spot.update', (spot?: Spot) => ({ status: spot?.status }))
  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() updateSpotDto: UpdateSpotDto,
  ) {
    return this.spotService.update(userId, id, updateSpotDto);
  }

  @Audit('spot.delete')
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.spotService.remove(userId, id);
  }
}
