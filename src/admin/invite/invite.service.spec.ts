import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { clerkClient } from '@clerk/express';
import { InviteService } from './invite.service.js';
import { BuildingInvite } from '../../membership/entities/building-invite.entity.js';
import { Building } from '../../building/entities/building.entity.js';
import { UserService } from '../../user/user.service.js';
import { MailService } from '../../mail/mail.service.js';
import { Role } from '../../auth/role.js';

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
    create: vi.fn((invite: unknown) => invite),
    save: vi.fn((invite: unknown) => Promise.resolve(invite)),
  };
  const buildingRepository = { findOneBy: vi.fn() };
  const mailService = { sendInvite: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    inviteRepository.existsBy.mockResolvedValue(false);
    buildingRepository.findOneBy.mockResolvedValue({ name: 'Bloc A' });
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
        { provide: UserService, useValue: {} },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<InviteService>(InviteService);
  });

  it('sends our own email instead of Clerk', async () => {
    await service.generateInvite(
      'b1',
      { email: ' Ana@Example.com ', apartment: '12' },
      Role.ADMIN,
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
        Role.ADMIN,
        'admin_1',
      ),
    ).rejects.toThrow('SMTP down');
    expect(clerkClient.invitations.revokeInvitation).toHaveBeenCalledWith(
      'inv_1',
    );
    expect(inviteRepository.save).not.toHaveBeenCalled();
  });
});
