import { BadRequestException } from '@nestjs/common';
import { PigeonService } from './pigeon.service';
import { PigeonApiService, PigeonApiError } from './pigeon-api.service';

// Тестовете са срещу спецификацията на Pigeon (openapi 1.0.27) с мокнати
// отговори — sandbox ключове още няма. При първия достъп се сверяват
// статусите (TODO(pigeon-codes)) и формата на track/bulk.

const config = {
  companyId: 'c1',
  isActive: true,
  apiKey: 'key',
  apiSecret: 'plain-secret',
  mode: 'sandbox',
  pickupType: 'office',
  pickupOfficeId: 1001,
  senderAddressId: null,
  serviceType: 'standard',
  whoPays: 'receiver',
  codEnabled: true,
  declaredValueEnabled: false,
  smsNotification: true,
  returnAtMyExpense: false,
};

function build() {
  const prisma = {
    pigeonConfig: {
      findUnique: jest.fn().mockResolvedValue(config),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    shipment: {
      create: jest.fn((args: any) =>
        Promise.resolve({ id: 'sh1', ...args.data }),
      ),
      findFirst: jest.fn(),
    },
  } as any;
  const api = new PigeonApiService();
  jest.spyOn(api, 'calculate').mockResolvedValue({
    shipping_price: 5.2,
    total_service_fees: 1.3,
    total_price: 6.5,
    service_type: 'standard',
    currency: 'EUR',
    service_fees: [{ name: 'Наложен платеж', amount: 1.3 }],
  });
  jest.spyOn(api, 'createShipment').mockResolvedValue({
    reference_number: 'PG123',
    status: 'Създадена от подател',
    packages: [{ tracking_number: 'PG123-1' }],
    label_pdf: 'JVBERi0=',
    created_at: '2026-11-07T10:00:00Z',
  });
  jest.spyOn(api, 'getOffice').mockResolvedValue({
    id: 1001,
    name: 'Офис Люлин',
    address: 'бул. Европа 1',
    city: { name: 'София' },
  });
  jest.spyOn(api, 'listAddresses').mockResolvedValue([]);
  jest.spyOn(api, 'listCompletedPayments').mockResolvedValue([]);
  const service = new PigeonService(prisma, api);
  return { prisma, api, service };
}

describe('PigeonService', () => {
  it('createShipment: превежда формата към заявката на Pigeon и пази пратката', async () => {
    const { api, service, prisma } = build();
    const dto: any = {
      orderId: 'o1',
      provider: 'pigeon',
      deliveryType: 'OFFICE',
      pigeonDeliveryKind: 'locker',
      pigeonOfficeId: 2002,
      officeName: 'Автомат Mall',
      receiverName: 'Иван Петров',
      receiverPhone: '0888123456',
      weight: 3,
      packCount: 2,
      dimensionsL: 30,
      codEnabled: true,
      codAmount: 120.5,
      payer: 'sender',
      currency: 'EUR',
      description: 'Книги',
      items: [{ description: 'Книга', count: 2, price: 60.25, weight: 1.5 }],
    };
    const shipment = await service.createShipment('c1', dto, {
      orderNumber: 'ORD-1',
    });

    const [creds, settings, params] = (api.createShipment as jest.Mock).mock
      .calls[0];
    expect(creds).toEqual({
      apiKey: 'key',
      apiSecret: 'plain-secret',
      mode: 'sandbox',
    });
    expect(settings.whoPays).toBe('sender'); // override от формата
    expect(settings.smsNotification).toBe(true); // от настройките
    expect(params.deliveryKind).toBe('locker');
    expect(params.deliveryOfficeId).toBe(2002);
    expect(params.packages).toHaveLength(2);
    expect(params.packages[0].weight).toBe(1.5);
    expect(params.codAmount).toBe(120.5);
    expect(params.inventoryItems).toEqual([
      { description: 'Книга', quantity: 2, unitPrice: 60.25, unitWeight: 1.5 },
    ]);

    const body = api.buildShipmentBody(settings, params);
    expect(body).toMatchObject({
      receiver_name: 'Иван Петров',
      pickup_type: 'office',
      pickup_office_id: 1001,
      delivery_type: 'locker',
      delivery_office_id: 2002,
      service_type: 'standard',
      who_pays: 'sender',
      service_codes: { cod_amount: 120.5, sms_notification_receiver: true },
      external_reference: 'ORD-1',
      return_at_my_expense: false,
    });
    expect(body.inventory_items).toEqual([
      {
        description: 'Книга',
        quantity: 2,
        unit_price: 60.25,
        unit_weight: 1.5,
      },
    ]);

    const data = prisma.shipment.create.mock.calls[0][0].data;
    expect(data.provider).toBe('pigeon');
    expect(data.shipmentNumber).toBe('PG123');
    expect(data.deliveryType).toBe('OFFICE'); // автоматът е „до офис" за нашата схема
    expect(data.officeCode).toBe('2002');
    expect(Number(data.shippingCost)).toBe(6.5);
    expect(data.pdfUrl).toBe('/companies/c1/shipping/pigeon/labels/PG123');
    expect(data.trackingData.carrier.label_pdf).toBeUndefined(); // base64 етикетът не влиза в базата
    expect(data.trackingData.origin).toEqual({
      officeCode: '1001',
      officeName: 'Офис Люлин, София',
      address: 'бул. Европа 1',
    });
    expect(data.trackingData.pigeon.trackingNumbers).toEqual(['PG123-1']);
    expect(shipment.id).toBe('sh1');
  });

  it('createShipment: без НП в формата не подава cod_amount', async () => {
    const { api, service } = build();
    await service.calculateShipping('c1', {
      provider: 'pigeon',
      deliveryType: 'ADDRESS',
      pigeonCityId: 68134,
      pigeonStreetId: 12345,
      addressNum: '100',
      pigeonFloor: '3',
      weight: 1,
      codEnabled: false,
      codAmount: 50,
    } as any);
    const [, settings, params] = (api.calculate as jest.Mock).mock.calls[0];
    const body = api.buildCalculateBody(settings, params);
    expect(body.service_codes).toEqual({ sms_notification_receiver: true });
    expect((body as any).delivery_address).toEqual({
      city_id: 68134,
      street_id: 12345,
      street_number: '100',
      floor: '3',
    });
    expect(body.who_pays).toBe('receiver');
  });

  it('calculateShipping: връща цена + разбивка в формата на модала', async () => {
    const { service } = build();
    const price = await service.calculateShipping('c1', {
      provider: 'pigeon',
      deliveryType: 'OFFICE',
      pigeonOfficeId: 1,
      weight: 1,
    } as any);
    expect(price.totalPrice).toBe(6.5);
    expect(price.currency).toBe('EUR');
    expect(price.services).toEqual([
      { type: 'COURIER', description: 'Куриерска услуга', price: 5.2 },
      { type: 'FEE', description: 'Наложен платеж', price: 1.3 },
    ]);
  });

  it('createShipment: без конфигурация отказва с ясно съобщение', async () => {
    const { prisma, service } = build();
    prisma.pigeonConfig.findUnique.mockResolvedValue({
      ...config,
      apiSecret: null,
    });
    await expect(
      service.createShipment('c1', { weight: 1 } as any, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('toTrackingResult', () => {
    const { service } = build();
    const base = {
      trackingData: {
        origin: { officeCode: '1001', officeName: 'Офис', address: null },
        insurance: null,
      },
    };

    it('регистрирана → CREATED, взета от куриер → IN_TRANSIT', () => {
      const created = service.toTrackingResult(
        {
          status_code: 'shipment_registered',
          status: 'Създадена от подател',
          tracking: [
            {
              status_code: 'shipment_registered',
              status: 'Създадена от подател',
              created_at: '2026-11-07T08:00:00Z',
            },
          ],
        },
        base,
        null,
      );
      expect(created.status).toBe('CREATED');
      expect(created.origin).toEqual(base.trackingData.origin);

      const moving = service.toTrackingResult(
        {
          status_code: 'shipment_courier_assigned',
          status: 'Взета от куриер',
          tracking: [
            {
              status_code: 'shipment_registered',
              status: 'Създадена от подател',
              created_at: '2026-11-07T08:00:00Z',
            },
            {
              status_code: 'shipment_courier_assigned',
              status: 'Взета от куриер',
              note: 'Куриер Иван',
              created_at: '2026-11-07T10:00:00Z',
            },
          ],
        },
        base,
        null,
      );
      expect(moving.status).toBe('IN_TRANSIT');
      expect(moving.sentAt?.toISOString()).toBe('2026-11-07T10:00:00.000Z');
      expect(moving.events[0].description).toBe(
        'Взета от куриер — Куриер Иван',
      );
      expect(moving.events[0].time).toBe('2026-11-07T10:00:00.000Z');
    });

    it('delivery_date → DELIVERED независимо от непознат код', () => {
      const r = service.toTrackingResult(
        {
          status_code: 'shipment_xyz',
          status: 'Непознат',
          delivery_date: '2026-11-08T12:00:00Z',
          tracking: [],
        },
        base,
        null,
      );
      expect(r.status).toBe('DELIVERED');
      expect(r.deliveredAt?.toISOString()).toBe('2026-11-08T12:00:00.000Z');
    });

    it('непознати кодове се превеждат по текста', () => {
      expect(
        service.toTrackingResult(
          {
            status_code: 'shipment_cancelled',
            status: 'Анулирана',
            tracking: [],
          },
          base,
          null,
        ).status,
      ).toBe('CANCELLED');
      expect(
        service.toTrackingResult(
          {
            status_code: 'shipment_returned',
            status: 'Върната на подател',
            tracking: [],
          },
          base,
          null,
        ).status,
      ).toBe('RETURNED');
      expect(
        service.toTrackingResult(
          {
            status_code: 'shipment_in_hub',
            status: 'В разпределителен склад',
            tracking: [],
          },
          base,
          null,
        ).status,
      ).toBe('IN_TRANSIT');
    });

    it('изплатен НП от отчета влиза в cod', () => {
      const r = service.toTrackingResult(
        {
          status_code: 'shipment_delivered',
          status: 'Доставена',
          delivery_date: '2026-11-08T12:00:00Z',
          tracking: [],
        },
        base,
        {
          amount: 120.5,
          collectedAt: new Date(2026, 10, 8),
          paidAt: new Date(2026, 10, 10),
        },
      );
      expect(r.cod).toEqual({
        collectedAmount: 120.5,
        collectedAt: new Date(2026, 10, 8),
        paidAmount: 120.5,
        paidAt: new Date(2026, 10, 10),
        currency: 'EUR',
      });
    });
  });

  it('trackShipments: bulk по номер + изплатените НП по waybill', async () => {
    const { api, service } = build();
    jest.spyOn(api, 'trackBulk').mockResolvedValue(
      new Map([
        [
          'PG1',
          {
            reference_number: 'PG1',
            status_code: 'shipment_courier_assigned',
            status: 'Взета от куриер',
            tracking: [],
          },
        ],
        ['PG2', { error: { message: 'Not found' } }],
      ]),
    );
    (api.listCompletedPayments as jest.Mock).mockResolvedValue([
      {
        waybill: 'PG1',
        external_reference: 'ORD-1',
        collected_date: '07-11-2026',
        paid_date: '10-11-2026',
        amount_eur: '45.00',
      },
    ]);
    const out = await service.trackShipments('c1', [
      { id: 'a', shipmentNumber: 'PG1', status: 'CREATED', trackingData: {} },
      { id: 'b', shipmentNumber: 'PG2', status: 'CREATED', trackingData: {} },
      { id: 'c', shipmentNumber: null, status: 'PENDING', trackingData: {} },
    ]);
    expect(out.get('a')).toMatchObject({
      ok: true,
      result: {
        status: 'IN_TRANSIT',
        cod: { paidAmount: 45, currency: 'EUR' },
      },
    });
    const paidAt = (out.get('a') as any).result.cod.paidAt as Date;
    expect([
      paidAt.getDate(),
      paidAt.getMonth() + 1,
      paidAt.getFullYear(),
    ]).toEqual([10, 11, 2026]);
    expect(out.get('b')).toEqual({ ok: false, error: 'Not found' });
    expect(out.has('c')).toBe(false);
    expect((api.trackBulk as jest.Mock).mock.calls[0][1]).toEqual([
      'PG1',
      'PG2',
    ]);
  });

  it('cancelShipment: 404 при Pigeon минава, друг отказ спира анулирането', async () => {
    const { api, service } = build();
    const cancel = jest
      .spyOn(api, 'cancel')
      .mockRejectedValueOnce(new PigeonApiError('Not found', 404));
    await expect(
      service.cancelShipment('c1', { shipmentNumber: 'PG1' }),
    ).resolves.toBeUndefined();
    cancel.mockRejectedValueOnce(
      new PigeonApiError('Пратката е вече предадена на куриер', 422),
    );
    await expect(
      service.cancelShipment('c1', { shipmentNumber: 'PG1' }),
    ).rejects.toThrow(/Pigeon не позволи анулиране.*предадена/);
    cancel.mockResolvedValueOnce({ status_code: 'shipment_cancelled' });
    await expect(
      service.cancelShipment('c1', { shipmentNumber: 'PG1' }),
    ).resolves.toBeUndefined();
  });

  it('updateConfig: секретът се шифрова, маскираният не го презаписва', async () => {
    const { prisma, service } = build();
    prisma.pigeonConfig.upsert.mockImplementation(async (args: any) => ({
      ...config,
      ...args.update,
    }));
    const res = await service.updateConfig('c1', {
      apiKey: ' key2 ',
      apiSecret: 'new-secret',
      whoPays: 'sender',
    });
    const update = prisma.pigeonConfig.upsert.mock.calls[0][0].update;
    expect(update.apiKey).toBe('key2');
    expect(update.apiSecret).not.toBe('new-secret');
    expect(update.whoPays).toBe('sender');
    expect(res.apiSecret).toBe('••••••••');

    await service.updateConfig('c1', { apiSecret: '••••••••' });
    expect(
      prisma.pigeonConfig.upsert.mock.calls[1][0].update.apiSecret,
    ).toBeUndefined();
  });
});
