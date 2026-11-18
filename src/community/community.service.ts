import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { Community } from './entities/community.entity.js';
import { Building } from '../building/entities/building.entity.js';
import { CreateCommunityDto } from './dto/create-community.dto.js';

/** A community of one shares nothing, so it needs at least this many buildings */
const MIN_BUILDINGS = 2;

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Community)
    private readonly communityRepository: Repository<Community>,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    private readonly dataSource: DataSource,
  ) {}

  /** Every community with its buildings, by name */
  findAll() {
    return this.communityRepository.find({
      relations: { buildings: true },
      select: {
        id: true,
        name: true,
        createdAt: true,
        buildings: { id: true, name: true },
      },
      order: { name: 'ASC', buildings: { name: 'ASC' } },
    });
  }

  async findOne(id: string, manager?: EntityManager) {
    const community = await (
      manager?.getRepository(Community) ?? this.communityRepository
    ).findOne({
      where: { id },
      relations: { buildings: true },
      select: {
        id: true,
        name: true,
        createdAt: true,
        buildings: { id: true, name: true },
      },
      order: { buildings: { name: 'ASC' } },
    });
    if (!community) throw new NotFoundException('Community not found');
    return community;
  }

  async create({ name, buildingIds }: CreateCommunityDto) {
    const ids = [...new Set(buildingIds)];
    if (ids.length < MIN_BUILDINGS) {
      throw new BadRequestException(
        `A community needs at least ${MIN_BUILDINGS} buildings`,
      );
    }
    return this.dataSource.transaction(async (manager) => {
      const buildings = await manager.findBy(Building, { id: In(ids) });
      if (buildings.length !== ids.length) {
        throw new NotFoundException('Building not found');
      }
      if (buildings.some((building) => building.communityId)) {
        throw new ConflictException('A building is already in a community');
      }
      const community = await manager.save(manager.create(Community, { name }));
      await this.join(manager, community.id, ids);
      return this.findOne(community.id, manager);
    });
  }

  async rename(id: string, name: string) {
    const { affected } = await this.communityRepository.update(
      { id },
      { name },
    );
    if (!affected) throw new NotFoundException('Community not found');
    return this.findOne(id);
  }

  async addBuilding(id: string, buildingId: string) {
    return this.dataSource.transaction(async (manager) => {
      if (!(await manager.existsBy(Community, { id }))) {
        throw new NotFoundException('Community not found');
      }
      const building = await manager.findOneBy(Building, { id: buildingId });
      if (!building) throw new NotFoundException('Building not found');
      if (building.communityId !== id) {
        if (building.communityId) {
          throw new ConflictException('The building is already in a community');
        }
        await this.join(manager, id, [buildingId]);
      }
      return this.findOne(id, manager);
    });
  }

  /**
   * Takes the building out; its residents' bookings stay. A community left with fewer than
   * two buildings is deleted.
   */
  async removeBuilding(id: string, buildingId: string) {
    await this.dataSource.transaction(async (manager) => {
      const { affected } = await manager.update(
        Building,
        { id: buildingId, communityId: id },
        { communityId: null },
      );
      if (!affected) {
        throw new NotFoundException('The building is not in this community');
      }
      const left = await manager.countBy(Building, { communityId: id });
      if (left < MIN_BUILDINGS) await this.dissolve(manager, id);
    });
  }

  /** Its buildings stay, each on its own again; bookings are kept */
  async remove(id: string) {
    await this.dataSource.transaction(async (manager) => {
      if (!(await this.dissolve(manager, id))) {
        throw new NotFoundException('Community not found');
      }
    });
  }

  /**
   * The user's buildings plus every building in a community with one of them: whose spots
   * they can find and book. Underground spots are filtered further by the search.
   */
  async visibleBuildingIds(memberBuildingIds: string[]) {
    if (memberBuildingIds.length === 0) return [];
    const rows = await this.buildingRepository
      .createQueryBuilder('building')
      .select('building.id', 'id')
      .where('building.id IN (:...ids)')
      .orWhere(
        `building."communityId" IN (
          SELECT member."communityId" FROM building member
          WHERE member.id IN (:...ids) AND member."communityId" IS NOT NULL
        )`,
      )
      .setParameters({ ids: memberBuildingIds })
      .getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }

  /** Only buildings in no community join, so two requests racing for one can't both win */
  private async join(
    manager: EntityManager,
    id: string,
    buildingIds: string[],
  ) {
    const { affected } = await manager.update(
      Building,
      { id: In(buildingIds), communityId: IsNull() },
      { communityId: id },
    );
    if (affected !== buildingIds.length) {
      throw new ConflictException('A building is already in a community');
    }
  }

  private async dissolve(manager: EntityManager, id: string) {
    await manager.update(Building, { communityId: id }, { communityId: null });
    const { affected } = await manager.delete(Community, { id });
    return Boolean(affected);
  }
}
