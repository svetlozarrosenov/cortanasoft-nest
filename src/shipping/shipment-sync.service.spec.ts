import { ShipmentSyncService } from './shipment-sync.service';
import { CarrierTrackingResult } from './interfaces';

// Тестове на общата логика (без куриер): какво се записва, кога се мести
// продажбата, кога се записва плащане по НП и че грешките не спират цикъла.

const result = (over: Partial<CarrierTrackingResult> = {}): CarrierTrackingResult => ({
  status: 'IN_TRANSIT',
  shortStatus: 'Приета',
  events: [],
  sentAt: new Date('2026-11-07T10:00:00Z'),
  deliveredAt: null,
  cod: null,
  origin: null,
  insurance: null,
  raw: {},
  ...over,
});

function build(opts: {
  shipments?: any[];
  outcomes?: Map<string, any>;
  automation?: Partial<{ syncStatuses: boolean; markOrdersDelivered: boolean; recordCodPayments: boolean }>;
  orderStatus?: string;
  existingPayment?: boolean;
  configured?: boolean;
  throwOnTrack?: boolean;
}) {
  const shipments = opts.shipments ?? [
    { id: 's1', orderId: 'o1', provider: 'econt', shipmentNumber: '111', status: 'CREATED', trackingData: null, currency: 'EUR' },
  ];
  const prisma: any = {
    shippingAutomation: {
      findUnique: jest.fn().mockResolvedValue(
        opts.automation ? { companyId: 'c1', syncStatuses: false, markOrdersDelivered: false, recordCodPayments: false, lastSyncAt: null, ...opts.automation } : null,
      ),
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    shipment: {
      findMany: jest.fn().mockResolvedValue(shipments),
      findFirst: jest.fn().mockResolvedValue(shipments[0]),
      update: jest.fn().mockResolvedValue({}),
    },
    order: {
      findFirst: jest.fn().mockResolvedValue({ id: 'o1', status: opts.orderStatus ?? 'CONFIRMED', orderNumber: 'ORD-1' }),
    },
    payment: {
      findFirst: jest.fn().mockResolvedValue(opts.existingPayment ? { id: 'p1' } : null),
    },
  };
  const provider = {
    name: 'econt',
    isConfigured: jest.fn().mockResolvedValue(opts.configured ?? true),
    trackShipments: opts.throwOnTrack
      ? jest.fn().mockRejectedValue(new Error('Еконт върна неочакван отговор'))
      : jest.fn().mockResolvedValue(opts.outcomes ?? new Map([['s1', { ok: true, result: result() }]])),
  };
  const registry: any = { get: jest.fn((n: string) => (n === 'econt' ? provider : undefined)) };
  const orders: any = { update: jest.fn().mockResolvedValue({}) };
  const payments: any = { create: jest.fn().mockResolvedValue({}) };
  const svc = new ShipmentSyncService(prisma, registry, orders, payments);
  return { svc, prisma, provider, orders, payments };
}

describe('ShipmentSyncService', () => {
  it('записва статус и събития, без автоматики не пипа продажбата и плащанията', async () => {
    const { svc, prisma, orders, payments } = build({});
    const r = await svc.syncCompany('c1');
    expect(r.checked).toBe(1);
    expect(r.updated).toBe(1);
    expect(prisma.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ status: 'IN_TRANSIT' }) }),
    );
    expect(orders.update).not.toHaveBeenCalled();
    expect(payments.create).not.toHaveBeenCalled();
    expect(prisma.shippingAutomation.upsert).toHaveBeenCalled();
  });

  it('доставена пратка → продажбата DELIVERED с датата на куриера (само при включена автоматика)', async () => {
    const delivered = new Date('2026-11-08T09:30:00Z');
    const { svc, orders } = build({
      automation: { markOrdersDelivered: true },
      outcomes: new Map([['s1', { ok: true, result: result({ status: 'DELIVERED', deliveredAt: delivered }) }]]),
      orderStatus: 'SHIPPED',
    });
    await svc.syncCompany('c1');
    expect(orders.update).toHaveBeenCalledWith('c1', 'o1', { status: 'DELIVERED', deliveredAt: delivered.toISOString() });
  });

  it('приета от куриера → продажбата SHIPPED, но чернова/чакаща не се мести', async () => {
    const a = build({ automation: { markOrdersDelivered: true }, orderStatus: 'CONFIRMED' });
    await a.svc.syncCompany('c1');
    expect(a.orders.update).toHaveBeenCalledWith('c1', 'o1', expect.objectContaining({ status: 'SHIPPED' }));

    const b = build({ automation: { markOrdersDelivered: true }, orderStatus: 'DRAFT' });
    await b.svc.syncCompany('c1');
    expect(b.orders.update).not.toHaveBeenCalled();

    const c = build({
      automation: { markOrdersDelivered: true },
      orderStatus: 'PENDING',
      outcomes: new Map([['s1', { ok: true, result: result({ status: 'DELIVERED', deliveredAt: new Date() }) }]]),
    });
    await c.svc.syncCompany('c1');
    expect(c.orders.update).not.toHaveBeenCalled();
  });

  it('изплатен НП → едно плащане COD с референция; второ обновяване не го дублира', async () => {
    const paidAt = new Date('2026-11-09T12:00:00Z');
    const cod = { collectedAmount: 110, collectedAt: new Date(), paidAmount: 110, paidAt, currency: 'EUR' };
    const a = build({
      automation: { recordCodPayments: true },
      outcomes: new Map([['s1', { ok: true, result: result({ status: 'DELIVERED', deliveredAt: new Date(), cod }) }]]),
    });
    await a.svc.syncCompany('c1');
    expect(a.payments.create).toHaveBeenCalledTimes(1);
    expect(a.payments.create).toHaveBeenCalledWith(
      'c1',
      null,
      expect.objectContaining({ orderId: 'o1', amount: 110, method: 'COD', paidAt: paidAt.toISOString(), reference: 'ECONT НП 111' }),
    );

    const b = build({
      automation: { recordCodPayments: true },
      existingPayment: true,
      outcomes: new Map([['s1', { ok: true, result: result({ status: 'DELIVERED', deliveredAt: new Date(), cod }) }]]),
    });
    await b.svc.syncCompany('c1');
    expect(b.payments.create).not.toHaveBeenCalled();
  });

  it('само събрана (неизплатена) сума не записва плащане', async () => {
    const cod = { collectedAmount: 110, collectedAt: new Date(), paidAmount: null, paidAt: null, currency: 'EUR' };
    const { svc, payments } = build({
      automation: { recordCodPayments: true },
      outcomes: new Map([['s1', { ok: true, result: result({ status: 'DELIVERED', deliveredAt: new Date(), cod }) }]]),
    });
    await svc.syncCompany('c1');
    expect(payments.create).not.toHaveBeenCalled();
  });

  it('грешка за една пратка не спира останалите; грешка на куриера влиза в отчета', async () => {
    const shipments = [
      { id: 's1', orderId: 'o1', provider: 'econt', shipmentNumber: '111', status: 'CREATED', trackingData: null, currency: 'EUR' },
      { id: 's2', orderId: 'o2', provider: 'econt', shipmentNumber: '222', status: 'CREATED', trackingData: null, currency: 'EUR' },
    ];
    const a = build({
      shipments,
      outcomes: new Map([
        ['s1', { ok: false, error: 'Не е намерена пратка с номер 111.' }],
        ['s2', { ok: true, result: result() }],
      ]),
    });
    const r = await a.svc.syncCompany('c1');
    expect(r.updated).toBe(1);
    expect(r.errors).toEqual(['111: Не е намерена пратка с номер 111.']);

    const b = build({ throwOnTrack: true });
    const rb = await b.svc.syncCompany('c1');
    expect(rb.updated).toBe(0);
    expect(rb.errors[0]).toMatch(/econt: Еконт върна неочакван отговор/);
  });

  it('неконфигуриран или непознат куриер се прескача', async () => {
    const a = build({ configured: false });
    const ra = await a.svc.syncCompany('c1');
    expect(a.provider.trackShipments).not.toHaveBeenCalled();
    expect(ra.updated).toBe(0);

    const b = build({
      shipments: [{ id: 's9', orderId: 'o9', provider: 'pigeon', shipmentNumber: '9', status: 'CREATED', trackingData: null, currency: 'EUR' }],
    });
    const rb = await b.svc.syncCompany('c1');
    expect(rb.errors).toEqual(['Неподдържан куриер: pigeon']);
  });
});
