import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity.js';
import { BuildingFeatureFlag } from './entities/building-feature-flag.entity.js';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto.js';

@Injectable()
export class FeatureFlagService {
  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepository: Repository<FeatureFlag>,
    @InjectRepository(BuildingFeatureFlag)
    private readonly buildingFlagRepository: Repository<BuildingFeatureFlag>,
  ) {}

  /** Off unless the building turned it on; off for a user without a building */
  isEnabled(buildingId: string | null | undefined, key: string) {
    if (!buildingId) return Promise.resolve(false);
    return this.buildingFlagRepository.existsBy({
      buildingId,
      flagKey: key,
      enabled: true,
    });
  }

  /** Keys of the flags the building has on */
  async enabledFor(buildingId: string | null | undefined) {
    if (!buildingId) return [];
    const rows = await this.buildingFlagRepository.findBy({
      buildingId,
      enabled: true,
    });
    return rows.map((row) => row.flagKey);
  }

  findAll() {
    return this.flagRepository.find({ order: { key: 'ASC' } });
  }

  async create({ key, description }: CreateFeatureFlagDto) {
    if (await this.flagRepository.existsBy({ key })) {
      throw new ConflictException(`Feature flag ${key} already exists`);
    }
    return this.flagRepository.save(
      this.flagRepository.create({ key, description: description ?? '' }),
    );
  }

  /** Also removes it from every building */
  async remove(key: string) {
    const result = await this.flagRepository.delete({ key });
    if (!result.affected) throw new NotFoundException('Feature flag not found');
  }

  /** Every flag with whether this building has it on */
  async forBuilding(buildingId: string) {
    const [flags, settings] = await Promise.all([
      this.findAll(),
      this.buildingFlagRepository.findBy({ buildingId }),
    ]);
    const enabled = new Set(
      settings.filter((s) => s.enabled).map((s) => s.flagKey),
    );
    return flags.map(({ key, description }) => ({
      key,
      description,
      enabled: enabled.has(key),
    }));
  }

  async set(buildingId: string, key: string, enabled: boolean) {
    if (!(await this.flagRepository.existsBy({ key }))) {
      throw new NotFoundException('Feature flag not found');
    }
    await this.buildingFlagRepository.upsert(
      { buildingId, flagKey: key, enabled },
      ['buildingId', 'flagKey'],
    );
    return { key, enabled };
  }
}
