import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  create(spotId: string, createScheduleDto: CreateScheduleDto[]) {
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
    spotId: string,
    id: string,
    updateScheduleDto: UpdateScheduleDto,
  ) {
    await this.scheduleRepository.update(id, updateScheduleDto);
    return this.findOne(spotId, id);
  }

  async remove(id: string) {
    await this.scheduleRepository.delete(id);

    return this;
  }
}
