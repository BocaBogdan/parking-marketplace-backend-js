import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';
import { ApiBody, ApiParam } from '@nestjs/swagger';

@Controller('spot/:spotId/schedule')
@ApiParam({ name: 'spotId', type: 'string' })
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @ApiBody({ type: [CreateScheduleDto] })
  create(
    @Param('spotId') spotId: string,
    @Body(new ParseArrayPipe({ items: CreateScheduleDto }))
    createScheduleDto: CreateScheduleDto[],
  ) {
    return this.scheduleService.create(spotId, createScheduleDto);
  }

  @Get()
  findAll(@Param('spotId') spotId: string) {
    return this.scheduleService.findAll(spotId);
  }

  @Get(':id')
  findOne(@Param('spotId') spotId: string, @Param('id') id: string) {
    return this.scheduleService.findOne(spotId, id);
  }

  @Patch(':id')
  update(
    @Param('spotId') spotId: string,
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(spotId, id, updateScheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(id);
  }
}
