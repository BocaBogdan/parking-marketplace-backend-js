import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SpotService } from './spot.service.js';
import { CreateSpotDto } from './dto/create-spot.dto.js';
import { UpdateSpotDto } from './dto/update-spot.dto.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CurrentBuildingId } from '../decorators/current-building-id.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';

@UseGuards(AuthGuard)
@Controller('spot')
export class SpotController {
  constructor(private readonly spotService: SpotService) {}

  @Post()
  // @UseInterceptors(FileInterceptor('file'))
  // @ApiConsumes('multipart/form-data')
  create(
    @CurrentUserId() userId: string,
    @CurrentBuildingId() buildingId: string,
    @Body() createSpotDto: CreateSpotDto,
    // @UploadedFile() file: Express.Multer.File,
  ) {
    return this.spotService.create(userId, buildingId, createSpotDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.spotService.findAll();
  }

  @Get('/available')
  findByInterval(
    @Query('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @Query('startMinute', ParseIntPipe) startMinute: number,
    @Query('endMinute', ParseIntPipe) endMinute: number,
  ) {
    return this.spotService.findByInterval(dayOfWeek, startMinute, endMinute);
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
    return this.spotService.booking(id);
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
