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
    const service = new SupportTicketsService(
      prisma as any,
      push as any,
      {} as any,
    );
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
      url: '/dashboard/owner/support?ticket=t1',
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

// Непрочетени на ниво потребител: съобщения от отсрещната страна след
// последното отваряне; за СВ Софт и самият нов тикет.
describe('SupportTicketsService.unreadByTicket', () => {
  const t = (iso: string) => new Date(iso);
  const tickets = [
    { id: 'a', createdAt: t('2026-10-01T10:00:00Z') },
    { id: 'b', createdAt: t('2026-10-02T10:00:00Z') },
  ];
  // a: клиентът пише 10:00/01, СВ Софт отговаря 10:00/02, клиентът пак 10:00/03
  const messages = [
    {
      ticketId: 'a',
      isFromSupport: false,
      createdAt: t('2026-10-01T12:00:00Z'),
    },
    {
      ticketId: 'a',
      isFromSupport: true,
      createdAt: t('2026-10-02T12:00:00Z'),
    },
    {
      ticketId: 'a',
      isFromSupport: false,
      createdAt: t('2026-10-03T12:00:00Z'),
    },
  ];

  const build = (reads: { ticketId: string; lastReadAt: Date }[]) => {
    const prisma = {
      supportTicket: { findMany: jest.fn().mockResolvedValue(tickets) },
      supportTicketRead: { findMany: jest.fn().mockResolvedValue(reads) },
      supportTicketMessage: {
        findMany: jest.fn(({ where }) =>
          Promise.resolve(
            messages.filter((m) => m.isFromSupport === where.isFromSupport),
          ),
        ),
      },
    };
    return new SupportTicketsService(prisma as any, {} as any, {} as any);
  };

  it('за СВ Софт: нов неотварян тикет и отговор на клиента след прочитането', async () => {
    const service = build([
      { ticketId: 'a', lastReadAt: t('2026-10-02T13:00:00Z') },
    ]);
    const unread = await (service as any).unreadByTicket(
      { userId: 'u', side: 'support' },
      {},
    );
    // a: само съобщението от 03.10 е след прочитането; b: никога не е отварян
    expect([...unread.entries()]).toEqual([
      ['b', 1],
      ['a', 1],
    ]);
  });

  it('за клиента: само отговорите на СВ Софт, нов тикет не е непрочетен', async () => {
    const service = build([]);
    const unread = await (service as any).unreadByTicket(
      { userId: 'u', side: 'customer' },
      { companyId: 'c' },
    );
    expect([...unread.entries()]).toEqual([['a', 1]]);
  });

  it('нищо непрочетено след отваряне', async () => {
    const service = build([
      { ticketId: 'a', lastReadAt: t('2026-10-04T00:00:00Z') },
    ]);
    const unread = await (service as any).unreadByTicket(
      { userId: 'u', side: 'customer' },
      { companyId: 'c' },
    );
    expect(unread.size).toBe(0);
  });
});

describe('SupportTicketsService.notifyCustomer', () => {
  const supportRole = {
    permissions: {
      modules: {
        support: {
          enabled: true,
          pages: { tickets: { enabled: true, actions: { view: true } } },
        },
      },
    },
  };
  const build = (pushEnabled: boolean) => {
    const prisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({
          pushNotificationsEnabled: pushEnabled,
        }),
      },
      userCompany: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'c1', role: supportRole },
          { userId: 'c2', role: { permissions: { modules: {} } } },
        ]),
      },
    };
    const push = { sendToUsers: jest.fn().mockResolvedValue({}) };
    return {
      service: new SupportTicketsService(prisma as any, push as any, {} as any),
      push,
    };
  };

  it('праща на потребителите на фирмата с право за Поддръжка и отваря тикета', async () => {
    const { service, push } = build(true);
    await (service as any).notifyCustomer('comp', 't1', {
      title: 'x',
      body: 'y',
    });
    expect(push.sendToUsers.mock.calls[0][0]).toEqual(['c1']);
    expect(push.sendToUsers.mock.calls[0][1]).toMatchObject({
      url: '/dashboard/comp/support?ticket=t1',
    });
  });

  it('мълчи, когато фирмата няма включени push известия', async () => {
    const { service, push } = build(false);
    await (service as any).notifyCustomer('comp', 't1', {
      title: 'x',
      body: 'y',
    });
    expect(push.sendToUsers).not.toHaveBeenCalled();
  });
});
