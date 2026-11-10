import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeatureFlagService } from './feature-flag.service.js';
import { FeatureFlag } from './entities/feature-flag.entity.js';
import { BuildingFeatureFlag } from './entities/building-feature-flag.entity.js';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  const flagRepository = {
    existsBy: vi.fn(),
    find: vi.fn(),
  };
  const buildingFlagRepository = {
    existsBy: vi.fn(),
    findBy: vi.fn(),
    upsert: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: getRepositoryToken(FeatureFlag), useValue: flagRepository },
        {
          provide: getRepositoryToken(BuildingFeatureFlag),
          useValue: buildingFlagRepository,
        },
      ],
    }).compile();

    service = module.get(FeatureFlagService);
  });

  describe('isEnabled', () => {
    it('is on when the building turned it on', async () => {
      buildingFlagRepository.existsBy.mockResolvedValue(true);
      await expect(service.isEnabled('b', 'FLAG')).resolves.toBe(true);
      expect(buildingFlagRepository.existsBy).toHaveBeenCalledWith({
        buildingId: 'b',
        flagKey: 'FLAG',
        enabled: true,
      });
    });

    it('is off without an enabled row', async () => {
      buildingFlagRepository.existsBy.mockResolvedValue(false);
      await expect(service.isEnabled('b', 'FLAG')).resolves.toBe(false);
    });

    it('is off for a user without a building', async () => {
      await expect(service.isEnabled(null, 'FLAG')).resolves.toBe(false);
      expect(buildingFlagRepository.existsBy).not.toHaveBeenCalled();
    });
  });

  it('lists every flag with the building state', async () => {
    flagRepository.find.mockResolvedValue([
      { key: 'A', description: 'a' },
      { key: 'B', description: 'b' },
    ]);
    buildingFlagRepository.findBy.mockResolvedValue([
      { flagKey: 'A', enabled: true },
      { flagKey: 'B', enabled: false },
    ]);
    await expect(service.forBuilding('b')).resolves.toEqual([
      { key: 'A', description: 'a', enabled: true },
      { key: 'B', description: 'b', enabled: false },
    ]);
  });

  describe('set', () => {
    it('upserts the building row', async () => {
      flagRepository.existsBy.mockResolvedValue(true);
      await expect(service.set('b', 'FLAG', true)).resolves.toEqual({
        key: 'FLAG',
        enabled: true,
      });
      expect(buildingFlagRepository.upsert).toHaveBeenCalledWith(
        { buildingId: 'b', flagKey: 'FLAG', enabled: true },
        ['buildingId', 'flagKey'],
      );
    });

    it('rejects an unknown flag', async () => {
      flagRepository.existsBy.mockResolvedValue(false);
      await expect(service.set('b', 'NOPE', true)).rejects.toThrow(
        NotFoundException,
      );
      expect(buildingFlagRepository.upsert).not.toHaveBeenCalled();
    });
  });
});
