import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, IsNull } from 'typeorm';
import { CommunityService } from './community.service.js';
import { Community } from './entities/community.entity.js';
import { Building } from '../building/entities/building.entity.js';

describe('CommunityService', () => {
  let service: CommunityService;
  const communityRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  };
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orWhere: vi.fn().mockReturnThis(),
    setParameters: vi.fn().mockReturnThis(),
    getRawMany: vi.fn(),
  };
  const buildingRepository = {
    createQueryBuilder: vi.fn(() => queryBuilder),
  };
  const communityInManager = { findOne: vi.fn() };
  const manager = {
    findBy: vi.fn(),
    findOneBy: vi.fn(),
    existsBy: vi.fn(),
    countBy: vi.fn(),
    create: vi.fn((_entity: unknown, data: object) => data),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getRepository: vi.fn(() => communityInManager),
  };
  const dataSource = {
    transaction: vi.fn((work: (m: typeof manager) => unknown) => work(manager)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityService,
        {
          provide: getRepositoryToken(Community),
          useValue: communityRepository,
        },
        { provide: getRepositoryToken(Building), useValue: buildingRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(CommunityService);
  });

  describe('create', () => {
    it('needs at least two different buildings', async () => {
      await expect(
        service.create({ name: 'C', buildingIds: ['a', 'a'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('rejects an unknown building', async () => {
      manager.findBy.mockResolvedValue([{ id: 'a', communityId: null }]);
      await expect(
        service.create({ name: 'C', buildingIds: ['a', 'b'] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a building already in a community', async () => {
      manager.findBy.mockResolvedValue([
        { id: 'a', communityId: null },
        { id: 'b', communityId: 'other' },
      ]);
      await expect(
        service.create({ name: 'C', buildingIds: ['a', 'b'] }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('groups the buildings', async () => {
      manager.findBy.mockResolvedValue([
        { id: 'a', communityId: null },
        { id: 'b', communityId: null },
      ]);
      manager.save.mockResolvedValue({ id: 'c', name: 'C' });
      manager.update.mockResolvedValue({ affected: 2 });
      communityInManager.findOne.mockResolvedValue({ id: 'c', buildings: [] });

      await expect(
        service.create({ name: 'C', buildingIds: ['a', 'b'] }),
      ).resolves.toEqual({ id: 'c', buildings: [] });
      expect(manager.update).toHaveBeenCalledWith(
        Building,
        { id: In(['a', 'b']), communityId: IsNull() },
        { communityId: 'c' },
      );
    });

    it('fails if another request took a building meanwhile', async () => {
      manager.findBy.mockResolvedValue([
        { id: 'a', communityId: null },
        { id: 'b', communityId: null },
      ]);
      manager.save.mockResolvedValue({ id: 'c' });
      manager.update.mockResolvedValue({ affected: 1 });
      await expect(
        service.create({ name: 'C', buildingIds: ['a', 'b'] }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('addBuilding', () => {
    beforeEach(() => manager.existsBy.mockResolvedValue(true));

    it('rejects a building of another community', async () => {
      manager.findOneBy.mockResolvedValue({ id: 'b', communityId: 'other' });
      await expect(service.addBuilding('c', 'b')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('adds a building without a community', async () => {
      manager.findOneBy.mockResolvedValue({ id: 'b', communityId: null });
      manager.update.mockResolvedValue({ affected: 1 });
      communityInManager.findOne.mockResolvedValue({ id: 'c' });
      await service.addBuilding('c', 'b');
      expect(manager.update).toHaveBeenCalledWith(
        Building,
        { id: In(['b']), communityId: IsNull() },
        { communityId: 'c' },
      );
    });

    it('rejects an unknown community', async () => {
      manager.existsBy.mockResolvedValue(false);
      await expect(service.addBuilding('c', 'b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('removeBuilding', () => {
    it('keeps a community that still has two buildings', async () => {
      manager.update.mockResolvedValue({ affected: 1 });
      manager.countBy.mockResolvedValue(2);
      await service.removeBuilding('c', 'b');
      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('deletes a community left with one building', async () => {
      manager.update.mockResolvedValue({ affected: 1 });
      manager.countBy.mockResolvedValue(1);
      manager.delete.mockResolvedValue({ affected: 1 });
      await service.removeBuilding('c', 'b');
      expect(manager.update).toHaveBeenLastCalledWith(
        Building,
        { communityId: 'c' },
        { communityId: null },
      );
      expect(manager.delete).toHaveBeenCalledWith(Community, { id: 'c' });
    });

    it('rejects a building that is not in the community', async () => {
      manager.update.mockResolvedValue({ affected: 0 });
      await expect(service.removeBuilding('c', 'b')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('frees the buildings when a community is deleted', async () => {
    manager.update.mockResolvedValue({ affected: 2 });
    manager.delete.mockResolvedValue({ affected: 1 });
    await service.remove('c');
    expect(manager.update).toHaveBeenCalledWith(
      Building,
      { communityId: 'c' },
      { communityId: null },
    );
  });

  describe('visibleBuildingIds', () => {
    it('is empty for a user without a building', async () => {
      await expect(service.visibleBuildingIds([])).resolves.toEqual([]);
      expect(buildingRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('adds the community buildings', async () => {
      queryBuilder.getRawMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      await expect(service.visibleBuildingIds(['a'])).resolves.toEqual([
        'a',
        'b',
      ]);
      expect(queryBuilder.setParameters).toHaveBeenCalledWith({ ids: ['a'] });
    });
  });
});
