import { SupportTicketsService } from './support-tickets.service';

// Push до екипа на СВ Софт при нов тикет / отговор на клиент: OWNER фирма с
// включени push + роля с право support.tickets → view.
describe('SupportTicketsService.notifySupport', () => {
  const supportRole = (view: boolean) => ({
    permissions: {
      modules: {
        support: {
          enabled: true,
          pages: { tickets: { enabled: true, actions: { view } } },
        },
      },
    },
  });

  const build = (opts: { pushEnabled: boolean; members: any[] }) => {
    const prisma = {
      company: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'owner',
          pushNotificationsEnabled: opts.pushEnabled,
        }),
      },
      userCompany: { findMany: jest.fn().mockResolvedValue(opts.members) },
    };
    const push = {
      sendToUsers: jest.fn().mockResolvedValue({ success: 1, failed: 0 }),
    };
    const service = new SupportTicketsService(prisma as any, push as any);
    return { service, prisma, push };
  };

  it('праща на членовете с право support.tickets.view', async () => {
    const { service, push } = build({
      pushEnabled: true,
      members: [
        { userId: 'u1', role: supportRole(true) },
        { userId: 'u2', role: supportRole(false) },
        {
          userId: 'u3',
          role: { permissions: { modules: { admin: { enabled: true } } } },
        },
      ],
    });
    await (service as any).notifySupport('t1', {
      title: 'Нов тикет',
      body: 'x',
    });
    expect(push.sendToUsers).toHaveBeenCalledTimes(1);
    expect(push.sendToUsers.mock.calls[0][0]).toEqual(['u1']);
    expect(push.sendToUsers.mock.calls[0][1]).toMatchObject({
      url: '/dashboard/admin/support',
      tag: 'support-ticket-t1',
    });
  });

  it('не праща нищо при изключен главен ключ на OWNER фирмата', async () => {
    const { service, push, prisma } = build({
      pushEnabled: false,
      members: [{ userId: 'u1', role: supportRole(true) }],
    });
    await (service as any).notifySupport('t1', { title: 'x', body: 'y' });
    expect(prisma.userCompany.findMany).not.toHaveBeenCalled();
    expect(push.sendToUsers).not.toHaveBeenCalled();
  });
});
