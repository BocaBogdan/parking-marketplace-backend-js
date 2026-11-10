import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminSpotService } from './spot.service.js';
import { Spot, SpotStatus } from '../../spot/entities/spot.entity.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { BuildingMembership } from '../../membership/entities/building-membership.entity.js';
import { StorageService } from '../../storage/storage.service.js';

describe('AdminSpotService', () => {
  let service: AdminSpotService;
  let spot: Partial<Spot> | null;
  const spotRepository = {
    findOneBy: vi.fn(() => Promise.resolve(spot)),
    update: vi.fn(),
  };
  const storage = { delete: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSpotService,
        { provide: getRepositoryToken(Spot), useValue: spotRepository },
        { provide: getRepositoryToken(Booking), useValue: {} },
        { provide: getRepositoryToken(BuildingMembership), useValue: {} },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(AdminSpotService);
  });

  it('deletes the PDF when confirming', async () => {
    spot = { id: 'spot', fileId: 'doc.pdf' };
    await service.updateStatus('b', 'spot', SpotStatus.CONFIRMED);
    expect(storage.delete).toHaveBeenCalledWith('doc.pdf');
  });

  it('confirms a spot that has no PDF', async () => {
    spot = { id: 'spot', fileId: null };
    await service.updateStatus('b', 'spot', SpotStatus.CONFIRMED);
    expect(storage.delete).not.toHaveBeenCalled();
    expect(spotRepository.update).toHaveBeenCalledWith('spot', {
      status: SpotStatus.CONFIRMED,
      rejectionReason: null,
    });
  });

  it('rejects a spot that has no PDF', async () => {
    spot = { id: 'spot', fileId: null };
    await service.updateStatus(
      'b',
      'spot',
      SpotStatus.REJECTED,
      'Wrong number',
    );
    expect(spotRepository.update).toHaveBeenCalledWith('spot', {
      status: SpotStatus.REJECTED,
      rejectionReason: 'Wrong number',
    });
  });
});
