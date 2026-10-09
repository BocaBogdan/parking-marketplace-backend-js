import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Building } from './entities/building.entity.js';
import { CreateBuildingDto } from './dto/create-building.dto.js';
import { UpdateBuildingDto } from './dto/update-building.dto.js';

@Injectable()
export class BuildingService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
  ) {}

  create(createBuildingDto: CreateBuildingDto) {
    const newBuilding = this.buildingRepository.create(createBuildingDto);
    return this.buildingRepository.save(newBuilding);
  }

  findAll() {
    return this.buildingRepository.find();
  }

  findOne(id: string) {
    return this.buildingRepository.findOneBy({ id });
  }

  async update(id: string, updateBuildingDto: UpdateBuildingDto) {
    await this.buildingRepository.update(id, updateBuildingDto);

    return this.buildingRepository.findOneBy({ id });
  }

  remove(id: string) {
    return this.buildingRepository.delete(id);
  }
}
