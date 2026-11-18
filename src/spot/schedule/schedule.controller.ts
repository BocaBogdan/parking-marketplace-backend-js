import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';
import { ApiBody, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard.js';
import { CurrentUserId } from '../../decorators/current-user-id.decorator.js';
import { Audit } from '../../audit/audit.decorator.js';
import type { Schedule } from './entities/schedule.entity.js';

@UseGuards(AuthGuard)
@Controller('spot/:spotId/schedule')
@ApiParam({ name: 'spotId', type: 'string' })
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Audit('schedule.create', (schedules: Schedule[]) => ({
    schedules: schedules.length,
    days: schedules.map((s) => s.dayOfWeek).join(','),
  }))
  @Post()
  @ApiBody({ type: [CreateScheduleDto] })
  create(
    @CurrentUserId() userId: string,
    @Param('spotId') spotId: string,
    @Body(new ParseArrayPipe({ items: CreateScheduleDto }))
    createScheduleDto: CreateScheduleDto[],
  ) {
    return this.scheduleService.create(userId, spotId, createScheduleDto);
  }

  @Get()
  findAll(@Param('spotId') spotId: string) {
    return this.scheduleService.findAll(spotId);
  }

  @Get(':id')
  findOne(@Param('spotId') spotId: string, @Param('id') id: string) {
    return this.scheduleService.findOne(spotId, id);
  }

  @Audit('schedule.update', (schedule?: Schedule | null) => ({
    day: schedule?.dayOfWeek,
    from: schedule?.startMinute,
    to: schedule?.endMinute,
  }))
  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('spotId') spotId: string,
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.scheduleService.update(userId, spotId, id, updateScheduleDto);
  }

  @Audit('schedule.delete')
  @Delete(':id')
  remove(
    @CurrentUserId() userId: string,
    @Param('spotId') spotId: string,
    @Param('id') id: string,
  ) {
    return this.scheduleService.remove(userId, spotId, id);
  }
}
