import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CarService } from './car.service.js';
import { CreateCarDto } from './dto/create-car.dto.js';
import { UpdateCarDto } from './dto/update-car.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';
import { Audit } from '../audit/audit.decorator.js';
import type { Car } from './entities/car.entity.js';

@UseGuards(AuthGuard)
@Controller('car')
export class CarController {
  constructor(private readonly carService: CarService) {}

  @Audit('car.create', (car: Car) => ({ car: car.id }))
  @Post()
  create(@CurrentUserId() userId: string, @Body() createCarDto: CreateCarDto) {
    return this.carService.create(userId, createCarDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.carService.findAll();
  }

  @Get('/mine')
  mine(@CurrentUserId() userId: string) {
    return this.carService.mine(userId);
  }

  @Get(':id')
  findOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.carService.findOne(userId, id);
  }

  @Audit('car.update')
  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() updateCarDto: UpdateCarDto,
  ) {
    return this.carService.update(userId, id, updateCarDto);
  }

  @Audit('car.delete')
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.carService.remove(userId, id);
  }
}
