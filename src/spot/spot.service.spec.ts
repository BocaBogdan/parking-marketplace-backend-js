import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SpotService } from './spot.service.js';
import { Spot } from './entities/spot.entity.js';
import { Schedule } from './schedule/entities/schedule.entity.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { BuildingMembership } from '../membership/entities/building-membership.entity.js';
import { StorageService } from '../storage/storage.service.js';
import { ownsSpotSql } from './ownership.js';

describe('SpotService', () => {
  let service: SpotService;
  let owned: Partial<Spot> | null;
  const spotRepository = {
    create: vi.fn((spot: Partial<Spot>) => spot),
    save: vi.fn((spot: Partial<Spot>) => Promise.resolve(spot)),
    delete: vi.fn(),
    createQueryBuilder: vi.fn(() => {
      const builder = {
        where: () => builder,
        andWhere: () => builder,
        getOne: () => Promise.resolve(owned),
      };
      return builder;
    }),
  };
  const membershipRepository = { findOneBy: vi.fn() };
  const file = { buffer: Buffer.from('%PDF') } as Express.Multer.File;
  const dto = {
    number: 7,
    description: 'Near the lift',
    location: { lat: '45.7', long: '21.2' },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpotService,
        { provide: getRepositoryToken(Spot), useValue: spotRepository },
        { provide: getRepositoryToken(Schedule), useValue: {} },
        { provide: getRepositoryToken(Booking), useValue: {} },
        {
          provide: getRepositoryToken(BuildingMembership),
          useValue: membershipRepository,
        },
        {
          provide: StorageService,
          useValue: { upload: () => Promise.resolve('file') },
        },
      ],
    }).compile();

    service = module.get<SpotService>(SpotService);
  });

  describe('create', () => {
    it("shares the spot with the creator's apartment", async () => {
      membershipRepository.findOneBy.mockResolvedValue({ apartment: '4' });
      const spot = await service.create('user', 'building', dto, file);
      expect(spot).toMatchObject({
        apartmentBuildingId: 'building',
        apartment: '4',
      });
    });

    it('shares it with nobody when the creator has no apartment', async () => {
      membershipRepository.findOneBy.mockResolvedValue({ apartment: '' });
      const spot = await service.create('user', 'building', dto, file);
      expect(spot).toMatchObject({
        apartmentBuildingId: null,
        apartment: null,
      });
    });
  });

  describe('remove', () => {
    it('lets the creator delete the spot', async () => {
      owned = { id: 'spot', userId: 'creator' };
      await service.remove('creator', 'spot');
      expect(spotRepository.delete).toHaveBeenCalledWith({
        id: 'spot',
        userId: 'creator',
      });
    });

    it('forbids a co-owner', async () => {
      owned = { id: 'spot', userId: 'creator' };
      await expect(service.remove('co-owner', 'spot')).rejects.toThrow(
        ForbiddenException,
      );
      expect(spotRepository.delete).not.toHaveBeenCalled();
    });

    it("reports someone else's spot as missing", async () => {
      owned = null;
      await expect(service.remove('stranger', 'spot')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe('ownsSpotSql', () => {
  const sql = ownsSpotSql('spot', ':userId');

  it("matches the apartment in the apartment's building, not the spot's", () => {
    expect(sql).toContain('member."buildingId"::text = spot."apartmentBuildingId"');
    expect(sql).toContain('member.apartment = spot.apartment');
  });

  it('shares nothing between members without an apartment', () => {
    expect(sql).toContain(`spot.apartment <> ''`);
  });
});
