import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SpotService } from './spot.service.js';
import { Schedule } from './schedule/entities/schedule.entity.js';
import { Booking } from '../booking/entities/booking.entity.js';
import { BuildingMembership } from '../membership/entities/building-membership.entity.js';
import { StorageService } from '../storage/storage.service.js';
import { ownsSpotSql } from './ownership.js';
import { FeatureFlagService } from '../feature-flag/feature-flag.service.js';
import { Spot, SpotStatus } from './entities/spot.entity.js';

describe('SpotService', () => {
  let service: SpotService;
  let owned: Partial<Spot> | null;
  const spotRepository = {
    create: vi.fn((spot: Partial<Spot>) => spot),
    save: vi.fn((spot: Partial<Spot>) => Promise.resolve(spot)),
    delete: vi.fn(),
    update: vi.fn(),
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
  const storage = {
    upload: vi.fn(() => Promise.resolve('file')),
    delete: vi.fn(),
  };
  const featureFlags = { isEnabled: vi.fn() };
  const file = { buffer: Buffer.from('%PDF-1.7') } as Express.Multer.File;
  const dto = {
    number: 7,
    description: 'Near the lift',
    location: { lat: '45.7', long: '21.2' },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    featureFlags.isEnabled.mockResolvedValue(false);
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
          useValue: storage,
        },
        { provide: FeatureFlagService, useValue: featureFlags },
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

  describe('create without the document flag', () => {
    it('stores the PDF and waits for review', async () => {
      const spot = await service.create('user', 'building', dto, file);
      expect(storage.upload).toHaveBeenCalled();
      expect(spot).toMatchObject({
        fileId: 'file',
        status: SpotStatus.PENDING,
      });
    });

    it('requires a document', async () => {
      await expect(service.create('user', 'building', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(spotRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a file that is not a PDF', async () => {
      const notPdf = { buffer: Buffer.from('hello') } as Express.Multer.File;
      await expect(
        service.create('user', 'building', dto, notPdf),
      ).rejects.toThrow(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });

  describe('create with the document flag', () => {
    beforeEach(() => featureFlags.isEnabled.mockResolvedValue(true));

    it('confirms the spot without a document', async () => {
      const spot = await service.create('user', 'building', dto);
      expect(featureFlags.isEnabled).toHaveBeenCalledWith(
        'building',
        'SPOT_DOCUMENT_NOT_REQUIRED',
      );
      expect(storage.upload).not.toHaveBeenCalled();
      expect(spot).toMatchObject({
        fileId: null,
        status: SpotStatus.CONFIRMED,
      });
    });

    it('ignores a document that was sent anyway', async () => {
      const notPdf = { buffer: Buffer.from('hello') } as Express.Multer.File;
      const spot = await service.create('user', 'building', dto, notPdf);
      expect(storage.upload).not.toHaveBeenCalled();
      expect(spot).toMatchObject({ fileId: null });
    });
  });

  describe('update', () => {
    const edit = { description: 'By the door' };

    it('sends every edit back for review without the flag', async () => {
      owned = { id: 'spot', buildingId: 'b', status: SpotStatus.CONFIRMED };
      await service.update('user', 'spot', edit);
      expect(spotRepository.update).toHaveBeenCalledWith(
        { id: 'spot' },
        { ...edit, status: SpotStatus.PENDING, rejectionReason: null },
      );
    });

    it('keeps a confirmed spot live with the flag', async () => {
      featureFlags.isEnabled.mockResolvedValue(true);
      owned = { id: 'spot', buildingId: 'b', status: SpotStatus.CONFIRMED };
      await service.update('user', 'spot', edit);
      expect(spotRepository.update).toHaveBeenCalledWith({ id: 'spot' }, edit);
    });

    it('sends a rejected spot back for review with the flag', async () => {
      featureFlags.isEnabled.mockResolvedValue(true);
      owned = { id: 'spot', buildingId: 'b', status: SpotStatus.REJECTED };
      await service.update('user', 'spot', edit);
      expect(spotRepository.update).toHaveBeenCalledWith(
        { id: 'spot' },
        { ...edit, status: SpotStatus.PENDING, rejectionReason: null },
      );
    });
  });

  describe('remove', () => {
    it('lets the creator delete the spot and its PDF', async () => {
      owned = { id: 'spot', userId: 'creator', fileId: 'doc.pdf' };
      await service.remove('creator', 'spot');
      expect(spotRepository.delete).toHaveBeenCalledWith({
        id: 'spot',
        userId: 'creator',
      });
      expect(storage.delete).toHaveBeenCalledWith('doc.pdf');
    });

    it('deletes a spot that has no PDF', async () => {
      owned = { id: 'spot', userId: 'creator', fileId: null };
      await service.remove('creator', 'spot');
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('forbids a co-owner', async () => {
      owned = { id: 'spot', userId: 'creator' };
      await expect(service.remove('co-owner', 'spot')).rejects.toThrow(
        ForbiddenException,
      );
      expect(spotRepository.delete).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
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
    expect(sql).toContain(
      'member."buildingId"::text = spot."apartmentBuildingId"',
    );
    expect(sql).toContain('member.apartment = spot.apartment');
  });

  it('shares nothing between members without an apartment', () => {
    expect(sql).toContain(`spot.apartment <> ''`);
  });
});
