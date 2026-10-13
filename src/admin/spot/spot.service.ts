import { Injectable } from '@nestjs/common';
import { Spot, SpotStatus } from '../../spot/entities/spot.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from '../../storage/storage.service.js';

@Injectable()
export class AdminSpotService {
  constructor(
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    private readonly storage: StorageService,
  ) {}

  getAllByBuildingId(buildingId: string) {
    return this.spotRepository.findBy({ buildingId });
  }

  async updateStatus(id: string, status: SpotStatus) {
    // if (status === SpotStatus.CONFIRMED) {
    //   const spot = await this.spotRepository.findOneBy({ id });
    //
    //   if (spot) {
    //     await this.storage.delete(spot.fileId);
    //   }
    // }
    // return this.spotRepository.update(id, { status });
  }
}
