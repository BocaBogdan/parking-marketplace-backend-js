import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard.js';
import { CurrentUserId } from '../../decorators/current-user-id.decorator.js';
import { OverrideService } from './override.service.js';
import { CreateOverrideDto } from './dto/create-override.dto.js';

/** "Free now" / "Busy" for a spot; only its owner may see or change them (404 otherwise) */
@UseGuards(AuthGuard)
@Controller('spot/:spotId/override')
@ApiParam({ name: 'spotId', type: 'string' })
export class OverrideController {
  constructor(private readonly overrideService: OverrideService) {}

  @Get()
  findActive(@CurrentUserId() userId: string, @Param('spotId') spotId: string) {
    return this.overrideService.findActive(userId, spotId);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Param('spotId') spotId: string,
    @Body() createOverrideDto: CreateOverrideDto,
  ) {
    return this.overrideService.create(userId, spotId, createOverrideDto);
  }

  @Delete(':id')
  @HttpCode(204)
  end(
    @CurrentUserId() userId: string,
    @Param('spotId') spotId: string,
    @Param('id') id: string,
  ) {
    return this.overrideService.end(userId, spotId, id);
  }
}
