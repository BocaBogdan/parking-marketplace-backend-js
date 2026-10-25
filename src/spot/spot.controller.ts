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
import { CurrentBuildingId } from '../decorators/current-building-id.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import { StatsService } from '../stats/stats.service.js';
import { StatsQueryDto } from '../stats/dto/stats-query.dto.js';

@UseGuards(AuthGuard)
@Controller('spot')
export class SpotController {
  constructor(
    private readonly spotService: SpotService,
    private readonly statsService: StatsService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  create(
    @CurrentUserId() userId: string,
    @CurrentBuildingId() buildingId: string,
    @Body() createSpotDto: CreateSpotDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.spotService.create(userId, buildingId, createSpotDto, file);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.spotService.findAll();
  }

  @Get('/available')
  findAvailable(@Query() { startsAt, endsAt }: AvailabilityQueryDto) {
    return this.spotService.findAvailable(startsAt, endsAt);
  }

  @Get('/mine')
  mine(@CurrentUserId() userId: string) {
    return this.spotService.mine(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.spotService.findOne(id);
  }

  @Get(':id/booking')
  booking(@Param('id') id: string) {
    return this.spotService.bookings(id);
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSpotDto: UpdateSpotDto) {
    return this.spotService.update(id, updateSpotDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.spotService.remove(id);
  }
}
