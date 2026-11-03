import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
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
import { PdfFileValidator } from './pdf-file.validator.js';

/** Same limit as the frontend's document picker */
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

@UseGuards(AuthGuard)
@Controller('spot')
export class SpotController {
  constructor(
    private readonly spotService: SpotService,
    private readonly statsService: StatsService,
  ) {}

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
    @CurrentBuildingId() buildingId: string,
    @Body() createSpotDto: CreateSpotDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_DOCUMENT_BYTES }),
          new PdfFileValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
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
  findAvailable(
    @CurrentUserId() userId: string,
    @CurrentBuildingId() buildingId: string | null,
    @Query() { startsAt, endsAt }: AvailabilityQueryDto,
  ) {
    return this.spotService.findAvailable(userId, buildingId, startsAt, endsAt);
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

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() updateSpotDto: UpdateSpotDto,
  ) {
    return this.spotService.update(userId, id, updateSpotDto);
  }

  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.spotService.remove(userId, id);
  }
}
