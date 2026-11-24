import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service.js';
import { AppUser } from './entities/app-user.entity.js';
import { BuildingMembership } from '../membership/entities/building-membership.entity.js';
import {
  BuildingInvite,
  InviteStatus,
} from '../membership/entities/building-invite.entity.js';

const getUser = vi.fn();
vi.mock('@clerk/express', () => ({
  clerkClient: { users: { getUser: (id: string) => getUser(id) } },
}));

describe('UserService', () => {
  let service: UserService;
  const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  const execute = vi.fn();
  const userRepository = {
    findOneBy: vi.fn(),
    create: vi.fn((user: object) => user),
    save: vi.fn((user: object) => Promise.resolve(user)),
    update: vi.fn(),
  };
  const membershipRepository = {
    find: vi.fn(),
    createQueryBuilder: () => ({
      insert: () => ({ values: () => ({ orIgnore: () => ({ execute }) }) }),
    }),
  };
  const inviteRepository = { findBy: vi.fn(), update: vi.fn() };
  const stored = {
    id: 'user_1',
    email: 'a@b.c',
    firstName: 'Ana',
    lastName: 'Pop',
    isAdmin: false,
  };
  const clerkUser = {
    id: 'user_1',
    firstName: 'Ana',
    lastName: 'Pop',
    primaryEmailAddress: { emailAddress: 'a@b.c' },
    emailAddresses: [
      { emailAddress: 'a@b.c', verification: { status: 'verified' } },
    ],
    publicMetadata: {},
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(AppUser), useValue: userRepository },
        {
          provide: getRepositoryToken(BuildingMembership),
          useValue: membershipRepository,
        },
        {
          provide: getRepositoryToken(BuildingInvite),
          useValue: inviteRepository,
        },
      ],
    }).compile();
    service = module.get(UserService);
  });

  describe('me', () => {
    it('keeps the stored profile when Clerk is down', async () => {
      userRepository.findOneBy.mockResolvedValue({ ...stored });
      membershipRepository.find.mockResolvedValue([]);
      getUser.mockRejectedValue(new Error('Clerk down'));
      const me = await service.me('user_1');
      expect(me).toMatchObject({ id: 'user_1', email: 'a@b.c' });
      expect(userRepository.update).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('user_1 profile refresh skipped'),
      );
    });

    it("answers 503 when a new user's account can't be read from Clerk", async () => {
      userRepository.findOneBy.mockResolvedValue(null);
      getUser.mockRejectedValue(new Error('Clerk down'));
      await expect(service.me('user_1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('syncFromClerk', () => {
    it("skips a legacy building that can't be joined", async () => {
      userRepository.findOneBy.mockResolvedValue(null);
      inviteRepository.findBy.mockResolvedValue([]);
      execute.mockRejectedValueOnce(new Error('foreign key'));
      const user = await service.syncFromClerk({
        ...clerkUser,
        publicMetadata: { buildingId: 'deleted' },
      } as never);
      expect(user.id).toBe('user_1');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('legacy membership skipped building=deleted'),
      );
    });

    it('leaves an invite pending when it cannot be claimed, and claims the rest', async () => {
      userRepository.findOneBy.mockResolvedValue(null);
      inviteRepository.findBy.mockResolvedValue([
        { id: 'i1', buildingId: 'deleted', role: 'RESIDENT', apartment: '1' },
        { id: 'i2', buildingId: 'b2', role: 'RESIDENT', apartment: '2' },
      ]);
      execute
        .mockRejectedValueOnce(new Error('foreign key'))
        .mockResolvedValueOnce({});
      const user = await service.syncFromClerk(clerkUser as never);
      expect(user.id).toBe('user_1');
      expect(inviteRepository.update).toHaveBeenCalledTimes(1);
      expect(inviteRepository.update).toHaveBeenCalledWith('i2', {
        status: InviteStatus.ACCEPTED,
      });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('invite claim failed invite=i1'),
      );
    });
  });
});
