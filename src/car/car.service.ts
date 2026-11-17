import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CreateCarDto } from './dto/create-car.dto.js';
import { UpdateCarDto } from './dto/update-car.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Car } from './entities/car.entity.js';
import { Repository } from 'typeorm';

@Injectable()
export class CarService implements OnModuleInit {
  private readonly logger = new Logger(CarService.name);

  constructor(
    @InjectRepository(Car) private readonly carRepository: Repository<Car>,
  ) {}

  /**
   * Plates saved before they were normalized (see `normalizePlate`) lose their spaces and
   * dashes. Changes nothing once every plate is clean.
   */
  async onModuleInit() {
    // For an UPDATE the postgres driver returns [rows, affected count]
    const result: unknown = await this.carRepository.query(
      `UPDATE car SET plate = upper(regexp_replace(plate, '[[:space:]-]', '', 'g'))
       WHERE plate ~ '[[:space:]-]' OR plate <> upper(plate)`,
    );
    const changed =
      Array.isArray(result) && typeof result[1] === 'number' ? result[1] : 0;
    if (changed > 0) this.logger.log(`Normalized ${changed} plate(s)`);
  }

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
