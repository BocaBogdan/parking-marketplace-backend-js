import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemberService } from './member.service.js';
import {
  BuildingMembership,
  MembershipRole,
} from '../../membership/entities/building-membership.entity.js';

describe('MemberService', () => {
  let service: MemberService;
  const membershipRepository = { findOne: vi.fn(), update: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MemberService,
        {
          provide: getRepositoryToken(BuildingMembership),
          useValue: membershipRepository,
        },
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
});
