import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccessService } from './access.service.js';
import { AppUser } from '../user/entities/app-user.entity.js';
import {
  BuildingMembership,
  MembershipRole,
} from '../membership/entities/building-membership.entity.js';

describe('AccessService', () => {
  let service: AccessService;
  const execute = vi.fn();
  const values = vi.fn(() => ({ orIgnore: () => ({ execute }) }));
  const userRepository = { findOne: vi.fn() };
  const membershipRepository = {
    find: vi.fn(),
    createQueryBuilder: () => ({ insert: () => ({ values }) }),
  };
  const resident = {
    buildingId: 'b1',
    role: MembershipRole.RESIDENT,
    apartment: '4',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AccessService,
        { provide: getRepositoryToken(AppUser), useValue: userRepository },
        {
          provide: getRepositoryToken(BuildingMembership),
          useValue: membershipRepository,
        },
      ],
    }).compile();
    service = module.get(AccessService);
  });

  it('loads the admin flag and memberships', async () => {
    userRepository.findOne.mockResolvedValue({ isAdmin: true });
    membershipRepository.find.mockResolvedValue([resident]);
    expect(await service.load('u1')).toEqual({
      isAdmin: true,
      memberships: [resident],
    });
    expect(values).not.toHaveBeenCalled();
  });

  it('never makes someone an admin from Clerk metadata', async () => {
    userRepository.findOne.mockResolvedValue({ isAdmin: false });
    membershipRepository.find.mockResolvedValue([resident]);
    const access = await service.load('u1', { role: 'ADMIN' });
    expect(access.isAdmin).toBe(false);
  });

  it('turns a legacy metadata building into a membership when there is none', async () => {
    userRepository.findOne.mockResolvedValue(null);
    membershipRepository.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([resident]);
    const access = await service.load('u1', {
      role: 'BUILDING_ADMIN',
      buildingId: 'b1',
      apartment: '4',
    });
    expect(values).toHaveBeenCalledWith({
      userId: 'u1',
      buildingId: 'b1',
      role: MembershipRole.BUILDING_ADMIN,
      apartment: '4',
    });
    expect(access.memberships).toEqual([resident]);
  });

  it('ignores legacy metadata once the user has memberships', async () => {
    userRepository.findOne.mockResolvedValue(null);
    membershipRepository.find.mockResolvedValue([resident]);
    await service.load('u1', { buildingId: 'other' });
    expect(values).not.toHaveBeenCalled();
  });
});
