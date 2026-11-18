import { MailService, romanianDays } from './mail.service.js';

describe('romanianDays', () => {
  it.each([
    [1, 'o zi'],
    [7, '7 zile'],
    [19, '19 zile'],
    [20, '20 de zile'],
    [30, '30 de zile'],
    [100, '100 de zile'],
    [101, '101 zile'],
  ])('%i → %s', (days, text) => {
    expect(romanianDays(days)).toBe(text);
  });
});

describe('MailService invite', () => {
  const service = new MailService({ from: 'noreply@test' } as never);
  const send = vi
    .spyOn(service as never as { send: () => Promise<void> }, 'send')
    .mockResolvedValue(undefined);

  beforeEach(() => send.mockClear());

  const invite = {
    to: 'ana@example.com',
    url: 'https://clerk.test/ticket',
    idempotencyKey: 'invite/inv_1',
    buildingName: 'Bloc A',
  };

  it('tells how long the link works', async () => {
    await service.sendInvite({ ...invite, expiresInDays: 7 });
    const [, email] = send.mock.calls[0] as unknown as [
      string,
      { text: string; html: string },
    ];
    expect(email.text).toContain('Linkul e valabil 7 zile.');
    expect(email.html).toContain('Linkul e valabil 7 zile.');
  });

  it('leaves the line out without a validity', async () => {
    await service.sendInvite(invite);
    const [, email] = send.mock.calls[0] as unknown as [
      string,
      { text: string },
    ];
    expect(email.text).not.toContain('valabil');
  });
});
