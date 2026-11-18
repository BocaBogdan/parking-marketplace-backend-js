import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { clerkClient } from '@clerk/express';
import { InviteService } from './invite.service.js';
import {
  BuildingInvite,
  InviteStatus,
} from '../../membership/entities/building-invite.entity.js';
import { MembershipRole } from '../../membership/entities/building-membership.entity.js';
import { Building } from '../../building/entities/building.entity.js';
import { UserService } from '../../user/user.service.js';
import { MailService } from '../../mail/mail.service.js';

vi.mock('@clerk/express', () => ({
  clerkClient: {
    users: { getUserList: vi.fn() },
    invitations: { createInvitation: vi.fn(), revokeInvitation: vi.fn() },
  },
}));

describe('InviteService', () => {
  let service: InviteService;
  const inviteRepository = {
    existsBy: vi.fn(),
    findOneBy: vi.fn(),
    update: vi.fn(),
    create: vi.fn((invite: unknown) => invite),
    save: vi.fn((invite: unknown) => Promise.resolve(invite)),
  };
  const buildingRepository = { findOneBy: vi.fn() };
  const mailService = { sendInvite: vi.fn() };
  const userService = { syncFromClerk: vi.fn(), addMembership: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    inviteRepository.existsBy.mockResolvedValue(false);
    buildingRepository.findOneBy.mockResolvedValue({
      name: 'Bloc A',
      inviteExpiryDays: 7,
    });
    vi.mocked(clerkClient.users.getUserList).mockResolvedValue({
      data: [],
    } as any);
    vi.mocked(clerkClient.invitations.createInvitation).mockResolvedValue({
      id: 'inv_1',
      url: 'https://clerk.test/ticket',
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        {
          provide: getRepositoryToken(BuildingInvite),
          useValue: inviteRepository,
        },
        { provide: getRepositoryToken(Building), useValue: buildingRepository },
        { provide: UserService, useValue: userService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<InviteService>(InviteService);
  });

  it('sends our own email instead of Clerk', async () => {
    await service.generateInvite(
      'b1',
      { email: ' Ana@Example.com ', apartment: '12' },
      true,
      'admin_1',
    );

    expect(clerkClient.invitations.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAddress: 'ana@example.com',
        notify: false,
      }),
    );
    expect(mailService.sendInvite).toHaveBeenCalledWith({
      to: 'ana@example.com',
      url: 'https://clerk.test/ticket',
      idempotencyKey: 'invite/inv_1',
      buildingName: 'Bloc A',
      apartment: '12',
      expiresInDays: 7,
    });
    expect(inviteRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ clerkInvitationId: 'inv_1' }),
    );
  });

  it('revokes the invitation and saves nothing when the email fails', async () => {
    mailService.sendInvite.mockRejectedValue(new Error('SMTP down'));

    await expect(
      service.generateInvite(
        'b1',
        { email: 'ana@example.com', apartment: '12' },
        true,
        'admin_1',
      ),
    ).rejects.toThrow('SMTP down');
    expect(clerkClient.invitations.revokeInvitation).toHaveBeenCalledWith(
      'inv_1',
    );
    expect(inviteRepository.save).not.toHaveBeenCalled();
  });

  describe('resend and revoke', () => {
    const pending = {
      id: 'i1',
      buildingId: 'b1',
      email: 'ana@example.com',
      role: MembershipRole.RESIDENT,
      apartment: '12',
      clerkInvitationId: 'inv_old',
      status: InviteStatus.PENDING,
    };

    beforeEach(() => {
      inviteRepository.findOneBy.mockResolvedValue({ ...pending });
      mailService.sendInvite.mockResolvedValue(undefined);
    });

    it('sends a fresh link and revokes the old one', async () => {
      const resent = await service.resend('b1', 'i1', false);
      expect(inviteRepository.findOneBy).toHaveBeenCalledWith({
        id: 'i1',
        buildingId: 'b1',
        status: InviteStatus.PENDING,
      });
      expect(clerkClient.invitations.revokeInvitation).toHaveBeenCalledWith(
        'inv_old',
      );
      expect(mailService.sendInvite).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ana@example.com', apartment: '12' }),
      );
      expect(inviteRepository.update).toHaveBeenCalledWith('i1', {
        clerkInvitationId: 'inv_1',
        expiresAt: expect.any(Date),
        createdAt: expect.any(Date),
      });
      expect(resent.clerkInvitationId).toBe('inv_1');
    });

    it('resends even when Clerk already expired the old link', async () => {
      vi.mocked(clerkClient.invitations.revokeInvitation).mockRejectedValueOnce(
        new Error('expired'),
      );
      await expect(service.resend('b1', 'i1', true)).resolves.toEqual(
        expect.objectContaining({ clerkInvitationId: 'inv_1' }),
      );
    });

    it('lets someone who signed up meanwhile join instead', async () => {
      vi.mocked(clerkClient.users.getUserList).mockResolvedValue({
        data: [{ id: 'user_1' }],
      } as any);
      userService.syncFromClerk.mockResolvedValue({ id: 'user_1' });
      const resent = await service.resend('b1', 'i1', true);
      expect(userService.addMembership).toHaveBeenCalledWith({
        buildingId: 'b1',
        role: MembershipRole.RESIDENT,
        apartment: '12',
        userId: 'user_1',
      });
      expect(clerkClient.invitations.createInvitation).not.toHaveBeenCalled();
      expect(resent.status).toBe(InviteStatus.ACCEPTED);
    });

    it('revokes at Clerk and frees the email', async () => {
      await service.revoke('b1', 'i1', false);
      expect(clerkClient.invitations.revokeInvitation).toHaveBeenCalledWith(
        'inv_old',
      );
      expect(inviteRepository.update).toHaveBeenCalledWith('i1', {
        status: InviteStatus.REVOKED,
      });
    });

    it("keeps building admins off a building admin's invitation", async () => {
      inviteRepository.findOneBy.mockResolvedValue({
        ...pending,
        role: MembershipRole.BUILDING_ADMIN,
      });
      await expect(service.revoke('b1', 'i1', false)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.resend('b1', 'i1', false)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.revoke('b1', 'i1', true)).resolves.toBeUndefined();
    });

    it('refuses an invite that is not pending in this building', async () => {
      inviteRepository.findOneBy.mockResolvedValue(null);
      await expect(service.revoke('b2', 'i1', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it("makes the link last the building's invite validity", async () => {
    const before = Date.now();
    const invite = await service.generateInvite(
      'b1',
      { email: 'ana@example.com', apartment: '12' },
      true,
      'admin_1',
    );
    expect(clerkClient.invitations.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ expiresInDays: 7 }),
    );
    const days = (invite.expiresAt!.getTime() - before) / 86_400_000;
    expect(days).toBeCloseTo(7, 2);
  });

  it('falls back to Clerk’s 30 days', async () => {
    buildingRepository.findOneBy.mockResolvedValue({ name: 'Bloc A' });
    await service.generateInvite(
      'b1',
      { email: 'ana@example.com', apartment: '12' },
      true,
      'admin_1',
    );
    expect(clerkClient.invitations.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ expiresInDays: 30 }),
    );
  });
});
