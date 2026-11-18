import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, MoreThan, Not } from 'typeorm';
import { MemberService } from './member.service.js';
import {
  BuildingMembership,
  MembershipRole,
} from '../../membership/entities/building-membership.entity.js';
import { Spot } from '../../spot/entities/spot.entity.js';
import { Booking } from '../../booking/entities/booking.entity.js';
import { StorageService } from '../../storage/storage.service.js';
import { CommunityService } from '../../community/community.service.js';

describe('MemberService', () => {
  let service: MemberService;
  const membershipRepository = {
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    find: vi.fn(),
    update: vi.fn(),
  };
  const cancel = {
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  };
  const manager = {
    findBy: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createQueryBuilder: vi.fn(() => cancel),
  };
  const dataSource = {
    transaction: vi.fn((work: (m: typeof manager) => unknown) => work(manager)),
  };
  const storage = { delete: vi.fn() };
  const communityService = { visibleBuildingIds: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: getRepositoryToken(BuildingMembership),
          useValue: membershipRepository,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: StorageService, useValue: storage },
        { provide: CommunityService, useValue: communityService },
      ],
    }).compile();
    service = module.get(MemberService);
  });

  const member = (role: MembershipRole) => ({
    id: 'm1',
    buildingId: 'b1',
    role,
    user: { id: 'u1' },
  });

  it('promotes a resident to building admin', async () => {
    membershipRepository.findOne.mockResolvedValue(
      member(MembershipRole.RESIDENT),
    );
    const updated = await service.updateRole(
      'b1',
      'm1',
      MembershipRole.BUILDING_ADMIN,
    );
    expect(membershipRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'm1', buildingId: 'b1' },
      relations: { user: true },
    });
    expect(membershipRepository.update).toHaveBeenCalledWith('m1', {
      role: MembershipRole.BUILDING_ADMIN,
    });
    expect(updated.role).toBe(MembershipRole.BUILDING_ADMIN);
  });

  it('demotes a building admin to resident', async () => {
    membershipRepository.findOne.mockResolvedValue(
      member(MembershipRole.BUILDING_ADMIN),
    );
    const updated = await service.updateRole(
      'b1',
      'm1',
      MembershipRole.RESIDENT,
    );
    expect(updated.role).toBe(MembershipRole.RESIDENT);
  });

  it('writes nothing when the role is already set', async () => {
    membershipRepository.findOne.mockResolvedValue(
      member(MembershipRole.RESIDENT),
    );
    await service.updateRole('b1', 'm1', MembershipRole.RESIDENT);
    expect(membershipRepository.update).not.toHaveBeenCalled();
  });

  it('refuses a membership of another building', async () => {
    membershipRepository.findOne.mockResolvedValue(null);
    await expect(
      service.updateRole('b2', 'm1', MembershipRole.RESIDENT),
    ).rejects.toThrow(NotFoundException);
  });

  describe('remove', () => {
    const admin = { isAdmin: true, memberships: [] };
    const buildingAdmin = { isAdmin: false, memberships: [] };
    const resident = {
      id: 'm1',
      buildingId: 'b1',
      userId: 'u1',
      role: MembershipRole.RESIDENT,
    };

    beforeEach(() => {
      membershipRepository.findOneBy.mockResolvedValue(resident);
      membershipRepository.find.mockResolvedValue([]);
      communityService.visibleBuildingIds.mockResolvedValue([]);
      manager.findBy.mockResolvedValue([]);
      cancel.execute.mockResolvedValue({ affected: 0 });
    });

    it('refuses a membership of another building', async () => {
      membershipRepository.findOneBy.mockResolvedValue(null);
      await expect(service.remove('b2', 'm1', 'a', admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lets only admins remove a building admin', async () => {
      membershipRepository.findOneBy.mockResolvedValue({
        ...resident,
        role: MembershipRole.BUILDING_ADMIN,
      });
      await expect(
        service.remove('b1', 'm1', 'a', buildingAdmin),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.remove('b1', 'm1', 'a', admin)).resolves.toEqual(
        expect.objectContaining({ spotsDeleted: 0 }),
      );
    });

    it("doesn't let a building admin remove themselves", async () => {
      await expect(
        service.remove('b1', 'm1', 'u1', buildingAdmin),
      ).rejects.toThrow(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('hands an apartment spot to a flatmate who stays', async () => {
      manager.findBy.mockResolvedValue([
        { id: 's1', apartment: '12', apartmentBuildingId: 'b1', fileId: null },
      ]);
      manager.findOne.mockResolvedValue({ userId: 'u2' });
      const removal = await service.remove('b1', 'm1', 'a', buildingAdmin);
      expect(manager.findOne).toHaveBeenCalledWith(BuildingMembership, {
        where: { buildingId: 'b1', apartment: '12', userId: Not('u1') },
        order: { createdAt: 'ASC' },
      });
      expect(manager.update).toHaveBeenCalledWith(
        Spot,
        { id: 's1' },
        { userId: 'u2' },
      );
      expect(manager.delete).not.toHaveBeenCalledWith(Spot, { id: 's1' });
      expect(removal).toEqual({
        userId: 'u1',
        spotsDeleted: 0,
        spotsKept: 1,
        bookingsCancelled: 0,
      });
    });

    it('deletes a spot nobody takes over, its upcoming bookings and its file', async () => {
      manager.findBy.mockResolvedValue([
        { id: 's1', apartment: null, apartmentBuildingId: null, fileId: 'f1' },
      ]);
      const removal = await service.remove('b1', 'm1', 'a', admin);
      expect(manager.findOne).not.toHaveBeenCalled();
      expect(manager.delete).toHaveBeenCalledWith(Booking, {
        spotId: 's1',
        endsAt: MoreThan(expect.any(Date)),
      });
      expect(manager.delete).toHaveBeenCalledWith(Spot, { id: 's1' });
      expect(storage.delete).toHaveBeenCalledWith('f1');
      expect(removal.spotsDeleted).toBe(1);
    });

    it("keeps the removal when a file can't be deleted", async () => {
      manager.findBy.mockResolvedValue([
        { id: 's1', apartment: null, apartmentBuildingId: null, fileId: 'f1' },
      ]);
      storage.delete.mockRejectedValue(new Error('down'));
      await expect(service.remove('b1', 'm1', 'a', admin)).resolves.toEqual(
        expect.objectContaining({ spotsDeleted: 1 }),
      );
    });

    it('cancels every upcoming booking when no building is left', async () => {
      cancel.execute.mockResolvedValue({ affected: 2 });
      const removal = await service.remove('b1', 'm1', 'a', admin);
      expect(cancel.andWhere).toHaveBeenCalledTimes(1);
      expect(removal.bookingsCancelled).toBe(2);
    });

    it('keeps upcoming bookings in buildings they still see', async () => {
      membershipRepository.find.mockResolvedValue([{ buildingId: 'b2' }]);
      communityService.visibleBuildingIds.mockResolvedValue(['b2', 'b3']);
      await service.remove('b1', 'm1', 'a', admin);
      expect(communityService.visibleBuildingIds).toHaveBeenCalledWith(['b2']);
      expect(cancel.andWhere).toHaveBeenLastCalledWith(
        expect.stringContaining('NOT EXISTS'),
        { visible: ['b2', 'b3'] },
      );
    });

    it('deletes the membership', async () => {
      await service.remove('b1', 'm1', 'a', admin);
      expect(manager.delete).toHaveBeenCalledWith(BuildingMembership, {
        id: 'm1',
      });
    });
  });
});
