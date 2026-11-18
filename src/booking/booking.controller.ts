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
import { CurrentAccess } from '../decorators/current-access.decorator.js';
import { memberBuildingIds, type Access } from '../auth/access.js';
import { CommunityService } from '../community/community.service.js';
import { Roles } from '../decorators/roles.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Audit } from '../audit/audit.decorator.js';
import type { Booking } from './entities/booking.entity.js';

@UseGuards(AuthGuard)
@Controller('booking')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly communityService: CommunityService,
  ) {}

  @Audit('booking.create', (booking: Booking) => ({
    booking: booking.id,
    spot: booking.spotId,
    car: booking.carId,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
  }))
  @Post()
  async create(
    @CurrentUserId() userId: string,
    @CurrentAccess() access: Access,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    // Spots of the user's buildings and of buildings in a community with them
    return this.bookingService.create(
      userId,
      await this.communityService.visibleBuildingIds(memberBuildingIds(access)),
      createBookingDto,
    );
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

  @Audit('booking.cancel')
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.bookingService.remove(userId, id);
  }
}
