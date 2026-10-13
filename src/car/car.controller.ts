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

@UseGuards(AuthGuard)
@Controller('car')
export class CarController {
  constructor(private readonly carService: CarService) {}

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
  findOne(@Param('id') id: string) {
    return this.carService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCarDto: UpdateCarDto) {
    return this.carService.update(id, updateCarDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.carService.remove(id);
  }
}
