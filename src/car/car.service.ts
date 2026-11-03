import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCarDto } from './dto/create-car.dto.js';
import { UpdateCarDto } from './dto/update-car.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Car } from './entities/car.entity.js';
import { Repository } from 'typeorm';

@Injectable()
export class CarService {
  constructor(
    @InjectRepository(Car) private readonly carRepository: Repository<Car>,
  ) {}

  create(userId: string, createCarDto: CreateCarDto) {
    const newCard = this.carRepository.create({ ...createCarDto, userId });
    return this.carRepository.save(newCard);
  }

  findAll() {
    return this.carRepository.find();
  }

  /** As a one-element array, which the frontend expects; 404 for anyone else's car */
  async findOne(userId: string, id: string) {
    const cars = await this.carRepository.findBy({ id, userId });
    if (!cars.length) throw new NotFoundException('Car not found');
    return cars;
  }

  mine(userId: string) {
    return this.carRepository.findBy({ userId });
  }

  async update(userId: string, id: string, updateCarDto: UpdateCarDto) {
    await this.findOne(userId, id);
    await this.carRepository.update({ id, userId }, updateCarDto);

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.carRepository.delete({ id, userId });
  }
}
