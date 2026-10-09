import { Injectable } from '@nestjs/common';
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

  create(createCarDto: CreateCarDto) {
    const newCard = this.carRepository.create(createCarDto);
    return this.carRepository.save(newCard);
  }

  findAll() {
    return this.carRepository.find();
  }

  findOne(id: string) {
    return this.carRepository.findBy({ id });
  }

  async update(id: string, updateCarDto: UpdateCarDto) {
    await this.carRepository.update(id, updateCarDto);

    return this.findOne(id);
  }

  remove(id: string) {
    return this.carRepository.delete(id);
  }
}
