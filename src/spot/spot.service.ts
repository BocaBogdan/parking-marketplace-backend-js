import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Spot, SpotStatus } from './entities/spot.entity.js';
import { CreateSpotDto } from './dto/create-spot.dto.js';
import { UpdateSpotDto } from './dto/update-spot.dto.js';
import { Schedule } from './schedule/entities/schedule.entity.js';
import { randomUUID } from 'node:crypto';
import { StorageService } from '../storage/storage.service.js';

@Injectable()
export class SpotService {
  constructor(
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    private readonly storage: StorageService,
  ) {}

  async create(
    userId: string,
    buildingId: string,
    createSpotDto: CreateSpotDto,
    // file: Express.Multer.File,
  ) {
    // const fileId = await this.storage.upload(`${randomUUID()}.pdf`, file);

    try {
      return await this.spotRepository.save(
        this.spotRepository.create({
          userId,
          buildingId,
          number: createSpotDto.number,
          description: createSpotDto.description,
          // lat: createSpotDto.location.lat,
          // long: createSpotDto.location.long,
          // fileId,
        }),
      );
    } catch (error) {
      // await this.storage.delete(fileId); // don't leave a file nothing points to
      throw error;
    }
  }

  findAll() {
    return this.spotRepository.find();
  }

  findOne(id: string) {
    return this.spotRepository.findOneBy({ id });
  }

  mine(userId: string) {
    return this.spotRepository.findBy({ userId });
  }

  booking(spotId: string) {
    return this.scheduleRepository.findBy({ spotId });
  }

  findByInterval(dayOfWeek: number, startMinute: number, endMinute: number) {
    return this.spotRepository
      .createQueryBuilder('spot')
      .innerJoin('spot.schedules', 'schedule')
      .where('schedule.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('schedule.startMinute <= :startMinute', { startMinute })
      .andWhere('schedule.endMinute >= :endMinute', { endMinute })
      .andWhere((qb) => {
        const sub = qb
          .subQuery()
          .select('booking.spotId')
          .from('booking', 'booking')
          .where('booking.dayOfWeek = :dayOfWeek')
          .andWhere('booking.startMinute < :endMinute')
          .andWhere('booking.endMinute > :startMinute')
          .getQuery();
        return 'spot.id NOT IN ' + sub;
      })
      .getMany();
  }

  async update(id: string, updateSpotDto: UpdateSpotDto) {
    await this.spotRepository.update(id, {
      ...updateSpotDto,
      // status: SpotStatus.PENDING,
    });
    return this.findOne(id);
  }

  remove(id: string) {
    return this.spotRepository.delete(id);
  }
}
