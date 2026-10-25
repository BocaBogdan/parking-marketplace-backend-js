import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spot } from '../../spot/entities/spot.entity.js';
import { StorageService } from '../../storage/storage.service.js';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Spot) private readonly spotRepository: Repository<Spot>,
    private readonly storage: StorageService,
  ) {}

  /** Only a document of a spot in this building, so no other key in the bucket leaks */
  async getByDocumentId(buildingId: string, id: string) {
    const spot = await this.spotRepository.findOneBy({
      fileId: id,
      buildingId,
    });
    if (!spot) throw new NotFoundException('Document not found');

    return this.storage.getSignedUrl(id);
  }
}
