import { Repository } from 'typeorm';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity.js';
import { Spot, SpotStatus } from '../entities/spot.entity.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
  ) {}

  async create(
    userId: string,
    spotId: string,
    createScheduleDto: CreateScheduleDto[],
  ) {
    await this.approvedSpot(userId, spotId);
    const schedules = createScheduleDto.map((dto) =>
      this.scheduleRepository.create({ ...dto, spotId }),
    );
    return this.scheduleRepository.save(schedules);
  }

  findAll(spotId: string) {
    return this.scheduleRepository.findBy({ spotId });
  }

  findOne(spotId: string, id: string) {
    return this.scheduleRepository.findOneBy({ spotId, id });
  }

  async update(
    userId: string,
    spotId: string,
    id: string,
    updateScheduleDto: UpdateScheduleDto,
  ) {
    await this.approvedSpot(userId, spotId);
    await this.scheduleRepository.update({ id, spotId }, updateScheduleDto);
    return this.findOne(spotId, id);
  }

  /** Allowed whatever the spot's status, so a spot back in review can still drop hours */
  async remove(userId: string, spotId: string, id: string) {
    await this.ownedSpot(userId, spotId);
    await this.scheduleRepository.delete({ id, spotId });
  }

  /** The user's own spot; anyone else's is reported as missing */
  private async ownedSpot(userId: string, spotId: string) {
    const spot = await this.spotRepository.findOneBy({ id: spotId, userId });
    if (!spot) throw new NotFoundException('Spot not found');
    return spot;
  }

  /** Weekly hours only make sense for a spot that can be booked */
  private async approvedSpot(userId: string, spotId: string) {
    const spot = await this.ownedSpot(userId, spotId);
    if (spot.status !== SpotStatus.CONFIRMED) {
      throw new ConflictException(
        'Weekly hours can be added once an admin approves the spot',
      );
    }
    return spot;
  }
}
