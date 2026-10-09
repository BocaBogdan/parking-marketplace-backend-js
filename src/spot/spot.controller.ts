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
} from '@nestjs/common';
import { SpotService } from './spot.service.js';
import { CreateSpotDto } from './dto/create-spot.dto.js';
import { UpdateSpotDto } from './dto/update-spot.dto.js';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator.js';
import { CurrentBuildingId } from '../auth/decorators/current-building-id.decorator.js';

// @UseGuards(AuthGuard)
@Controller('spot')
export class SpotController {
  constructor(private readonly spotService: SpotService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @CurrentBuildingId() buildingId: string,
    @Body() createSpotDto: CreateSpotDto,
  ) {
    return this.spotService.create(
      'user_3KMgox05TKvlfQ26bDuljV7nldW',
      '8e49bd9c-baf5-4324-8f36-544e868e9ba6',
      createSpotDto,
    );
  }

  @Get()
  findAll() {
    return this.spotService.findAll();
  }

  @Get('available')
  findByInterval(
    @Query('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @Query('startMinute', ParseIntPipe) startMinute: number,
    @Query('endMinute', ParseIntPipe) endMinute: number,
  ) {
    return this.spotService.findByInterval(dayOfWeek, startMinute, endMinute);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.spotService.findOne(id);
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
