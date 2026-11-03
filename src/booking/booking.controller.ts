import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { CurrentBuildingId } from '../decorators/current-building-id.decorator.js';
import { Roles } from '../decorators/roles.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';

@UseGuards(AuthGuard)
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @CurrentBuildingId() buildingId: string | null,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    return this.bookingService.create(userId, buildingId, createBookingDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.bookingService.findAll();
  }

  @Get('/mine')
  mine(@CurrentUserId() userId: string) {
    return this.bookingService.mine(userId);
  }

  @Get(':id')
  findOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.bookingService.findOne(userId, id);
  }

  // No PATCH: changing a booking would skip the availability checks, so cancel and rebook

  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.bookingService.remove(userId, id);
  }
}
