import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BookingService } from './booking.service.js';
import { Booking } from './entities/booking.entity.js';
import { Spot } from '../spot/entities/spot.entity.js';
import { SpotService } from '../spot/spot.service.js';

describe('BookingService', () => {
  let service: BookingService;
  const bookingRepository = { find: vi.fn(), findOneBy: vi.fn() };
  const spots = {
    leftJoinAndMapOne: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getMany: vi.fn(),
  };
  const spotRepository = { createQueryBuilder: vi.fn(() => spots) };

  const booking = (id: string, spotId: string) =>
    ({ id, spotId, userId: 'user_1' }) as Booking;
  const spot12 = {
    id: 's12',
    number: 12,
    underground: true,
    description: 'Next to the lift',
    building: { id: 'b1', name: 'Building A', address: 'not exposed' },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepository },
        { provide: getRepositoryToken(Spot), useValue: spotRepository },
        { provide: SpotService, useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();
    service = module.get(BookingService);
  });

  describe('mine', () => {
    it('adds the spot each booking is for, loading each spot once', async () => {
      bookingRepository.find.mockResolvedValue([
        booking('k1', 's12'),
        booking('k2', 's12'),
      ]);
      spots.getMany.mockResolvedValue([spot12]);

      const bookings = await service.mine('user_1');

      expect(spots.where).toHaveBeenCalledWith('spot.id IN (:...ids)', {
        ids: ['s12'],
      });
      expect(bookings.map((b) => b.spot)).toEqual([
        {
          id: 's12',
          number: 12,
          underground: true,
          description: 'Next to the lift',
          building: { id: 'b1', name: 'Building A' },
        },
        expect.objectContaining({ number: 12 }),
      ]);
    });

    it('marks a booking whose spot was deleted with a null spot', async () => {
      bookingRepository.find.mockResolvedValue([booking('k1', 'gone')]);
      spots.getMany.mockResolvedValue([]);
      const [only] = await service.mine('user_1');
      expect(only.spot).toBeNull();
    });

    it("doesn't query spots when there are no bookings", async () => {
      bookingRepository.find.mockResolvedValue([]);
      expect(await service.mine('user_1')).toEqual([]);
      expect(spotRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the booking with its spot', async () => {
      bookingRepository.findOneBy.mockResolvedValue(booking('k1', 's12'));
      spots.getMany.mockResolvedValue([{ ...spot12, building: undefined }]);
      const found = await service.findOne('user_1', 'k1');
      expect(found.spot).toMatchObject({ number: 12, building: null });
    });

    it("reports someone else's booking as missing", async () => {
      bookingRepository.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('user_1', 'k1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
