import { BadRequestException } from '@nestjs/common';
import { PigeonService } from './pigeon.service';
import { PigeonApiService, PigeonApiError } from './pigeon-api.service';

// Mocked answers in the shapes the Pigeon sandbox returned on 2026-11-23
// (openapi 1.0.32): status codes, track/bulk, shipment pricing, cancel.

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
  jest.spyOn(api, 'getShipment').mockResolvedValue({
    service_type: 'standard',
    pricing: {
      payer: 'receiver',
      courier_service: 2.97,
      fees: [
        { code: 'insurance_required', name: 'Обявена стойност', amount: 0.25 },
        { code: 'cod_fee', name: 'Наложен платеж', amount: 0.75 },
        { code: 'fuel_fee', name: 'Такса гориво', amount: 0.5 },
      ],
      total: 4.47,
    },
    cod: { amount: 50, currency: 'EUR' },
  });
  jest.spyOn(api, 'track').mockResolvedValue({
    status_code: 'shipment_registered',
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
      dimensionsW: 20,
      dimensionsH: 10,
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
    // The cost is what Pigeon charges for the created shipment, fee by fee
    expect(Number(data.shippingCost)).toBe(4.47);
    expect(data.trackingData.price.declaredValuePrice).toBe(0.25);
    expect(api.calculate).not.toHaveBeenCalled();
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
      dimensionsL: 20,
      dimensionsW: 15,
      dimensionsH: 10,
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
      dimensionsL: 20,
      dimensionsW: 15,
      dimensionsH: 10,
    } as any);
    expect(price.totalPrice).toBe(6.5);
    expect(price.currency).toBe('EUR');
    expect(price.services).toEqual([
      { type: 'COURIER', description: 'Куриерска услуга', price: 5.2 },
      { type: 'FEE', description: 'Наложен платеж', price: 1.3 },
    ]);
  });

  it('calculateShipping: взимане от адрес подава самия адрес на подателя', async () => {
    const { api, prisma, service } = build();
    prisma.pigeonConfig.findUnique.mockResolvedValue({
      ...config,
      pickupType: 'address',
      pickupOfficeId: null,
      senderAddressId: 130,
    });
    (api.listAddresses as jest.Mock).mockResolvedValue([
      { id: 7, is_default: true, address: { city_id: 1 } },
      {
        id: 130,
        is_default: false,
        address: {
          city_id: 759,
          street_id: 434109,
          street_number: '18',
          postal_code: '1000',
          floor: '2',
        },
      },
    ]);
    const dto: any = {
      provider: 'pigeon',
      deliveryType: 'OFFICE',
      pigeonOfficeId: 509,
      weight: 1,
      dimensionsL: 20,
      dimensionsW: 15,
      dimensionsH: 10,
    };
    await service.calculateShipping('c1', dto);
    const [, settings, params, pickup] = (api.calculate as jest.Mock).mock
      .calls[0];
    const body: any = api.buildCalculateBody(settings, params, pickup);
    // The calculation does not know saved addresses by id
    expect(body.sender_address_id).toBeUndefined();
    expect(body.pickup_address).toEqual({
      city_id: 759,
      street_id: 434109,
      street_number: '18',
      postal_code: '1000',
    });
    // Creating does
    expect(
      (api.buildShipmentBody(settings, params) as any).sender_address_id,
    ).toBe(130);

    // The chosen address is gone from the profile: no silent other address
    (api.listAddresses as jest.Mock).mockResolvedValue([
      { id: 7, is_default: true, address: { city_id: 1 } },
    ]);
    await expect(service.calculateShipping('c1', dto)).rejects.toThrow(
      /няма запазен адрес/,
    );
  });

  it('createShipment: без избран адрес взима този по подразбиране или единствения', async () => {
    const { api, prisma, service } = build();
    prisma.pigeonConfig.findUnique.mockResolvedValue({
      ...config,
      pickupType: 'address',
      pickupOfficeId: null,
      senderAddressId: null,
    });
    // Pigeon's own fallback needs a default address; this profile has none
    (api.listAddresses as jest.Mock).mockResolvedValue([
      { id: 130, is_default: false, address: { city_id: 759 } },
    ]);
    const dto: any = {
      orderId: 'o1',
      provider: 'pigeon',
      deliveryType: 'OFFICE',
      pigeonOfficeId: 509,
      receiverName: 'Иван Петров',
      receiverPhone: '0888123456',
      weight: 1,
      dimensionsL: 20,
      dimensionsW: 15,
      dimensionsH: 10,
    };
    await service.createShipment('c1', dto, { orderNumber: 'ORD-4' });
    const [, settings, params] = (api.createShipment as jest.Mock).mock
      .calls[0];
    expect(
      (api.buildShipmentBody(settings, params) as any).sender_address_id,
    ).toBe(130);

    (api.listAddresses as jest.Mock).mockResolvedValue([]);
    await expect(
      service.createShipment('c1', dto, { orderNumber: 'ORD-4' }),
    ).rejects.toThrow(/няма запазен адрес/);
  });

  it('без трите размера отказва, без редове описва пратката с един ред', async () => {
    const { api, service } = build();
    const dto: any = {
      orderId: 'o1',
      provider: 'pigeon',
      deliveryType: 'OFFICE',
      pigeonOfficeId: 509,
      receiverName: 'Иван Петров',
      receiverPhone: '0888123456',
      weight: 1,
      dimensionsL: 20,
      dimensionsW: 15,
    };
    await expect(
      service.createShipment('c1', dto, { orderNumber: 'ORD-2' }),
    ).rejects.toThrow(/дължина, ширина и височина/);
    expect(api.createShipment).not.toHaveBeenCalled();

    await service.createShipment(
      'c1',
      { ...dto, dimensionsH: 10 },
      { orderNumber: 'ORD-2' },
    );
    const [, settings, params] = (api.createShipment as jest.Mock).mock
      .calls[0];
    expect(api.buildShipmentBody(settings, params).inventory_items).toEqual([
      { description: 'ORD-2', quantity: 1 },
    ]);
  });

  it('дробно количество отива като един ред с количеството в името', async () => {
    const { api, service } = build();
    await service.createShipment(
      'c1',
      {
        orderId: 'o1',
        provider: 'pigeon',
        deliveryType: 'OFFICE',
        pigeonOfficeId: 509,
        receiverName: 'Иван Петров',
        receiverPhone: '0888123456',
        weight: 2,
        dimensionsL: 20,
        dimensionsW: 15,
        dimensionsH: 10,
        items: [
          { description: 'Кабел', count: 1.5, price: 4, weight: 0.2 },
          { description: 'Ключ', count: 2, price: 3 },
        ],
      } as any,
      { orderNumber: 'ORD-3' },
    );
    const [, settings, params] = (api.createShipment as jest.Mock).mock
      .calls[0];
    expect(api.buildShipmentBody(settings, params).inventory_items).toEqual([
      {
        description: 'Кабел (1.5)',
        quantity: 1,
        unit_price: 6,
        unit_weight: 0.3,
      },
      { description: 'Ключ', quantity: 2, unit_price: 3 },
    ]);
  });

  it('getOffices: търси и по град, не само по име на офиса', async () => {
    const { api, service } = build();
    const offices = jest
      .spyOn(api, 'listOffices')
      .mockImplementation(async (_creds, opts: any = {}) =>
        opts.cityId === 712
          ? [
              { id: 1, name: 'ЖП Гара' },
              { id: 2, name: 'Център' },
            ]
          : [{ id: 2, name: 'Център' }],
      );
    jest.spyOn(api, 'listCities').mockResolvedValue([
      { id: 900, name: 'Варненци', type: 'село' },
      { id: 712, name: 'Варна', type: 'град' },
      { id: 901, name: 'Нова Варна', type: 'село' },
    ]);
    const found = await service.getOffices('c1', {
      type: 'office',
      name: 'Варна',
    });
    // The town's offices first, the office found by name not repeated
    expect(found.map((o: any) => o.id)).toEqual([1, 2]);
    expect(offices.mock.calls.map((c) => (c[1] as any).cityId)).toEqual([
      undefined,
      712,
    ]);

    // One letter, or a town already chosen: Pigeon's own search only
    offices.mockClear();
    await service.getOffices('c1', { name: 'В' });
    await service.getOffices('c1', { name: 'Център', cityId: 712 });
    expect(offices).toHaveBeenCalledTimes(2);
  });

  it('getCities: точното име и градовете са първи', async () => {
    const { api, service } = build();
    jest.spyOn(api, 'listCities').mockResolvedValue([
      { id: 1, name: 'Нова София', type: 'село' },
      { id: 2, name: 'София Запад', type: 'село' },
      { id: 3, name: 'София', type: 'град' },
    ]);
    const cities = await service.getCities('c1', 'софия');
    expect(cities.map((c: any) => c.id)).toEqual([3, 2, 1]);
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

    const statusOf = (
      status_code: string,
      status: string,
      extra: Record<string, unknown> = {},
    ) =>
      service.toTrackingResult(
        { status_code, status, tracking: [], ...extra },
        base,
        null,
      );

    it('само „взета от получателя" е доставена', () => {
      const delivered = statusOf(
        'shipment_delivered_to_recipient',
        'Взета от получателя',
        { delivery_date: '2026-11-08T12:00:00Z' },
      );
      expect(delivered.status).toBe('DELIVERED');
      expect(delivered.deliveredAt?.toISOString()).toBe(
        '2026-11-08T12:00:00.000Z',
      );
      // On the way or waiting for the recipient: the text says "delivery"
      // but nobody has the parcel yet
      for (const [code, text] of [
        ['shipment_in_delivery', 'В процес на доставка'],
        ['shipment_delivered_to_office', 'Доставена в офис/локър'],
        ['shipment_delivery_problem', 'Проблем при доставка'],
        ['shipment_delivery_attempt_failed', 'Неуспешен опит за доставка'],
        ['shipment_untracked', 'Непотърсена'],
      ]) {
        const r = statusOf(code, text);
        expect([code, r.status]).toEqual([code, 'IN_TRANSIT']);
        expect(r.deliveredAt).toBeNull();
      }
    });

    it('връщане към подател е на път, върната е върната, отказана е анулирана', () => {
      expect(
        statusOf('shipment_returning_to_sender', 'Връщане към подател').status,
      ).toBe('IN_TRANSIT');
      expect(statusOf('shipment_returned', 'Върната').status).toBe('RETURNED');
      expect(statusOf('shipment_cancelled', 'Отказана').status).toBe(
        'CANCELLED',
      );
      expect(
        statusOf(
          'shipment_awaiting_courier_pickup',
          'Очаква товарене от куриер',
        ).status,
      ).toBe('CREATED');
      // A delivery date on a returned shipment does not make it delivered
      const returned = statusOf('shipment_returned', 'Върната', {
        delivery_date: '2026-11-08T12:00:00Z',
      });
      expect(returned.status).toBe('RETURNED');
      expect(returned.deliveredAt).toBeNull();
    });

    it('код, който Pigeon добави по-късно, се чете по датата на доставка и текста', () => {
      const r = statusOf('shipment_xyz', 'Непознат', {
        delivery_date: '2026-11-08T12:00:00Z',
      });
      expect(r.status).toBe('DELIVERED');
      expect(r.deliveredAt?.toISOString()).toBe('2026-11-08T12:00:00.000Z');
      expect(
        statusOf('shipment_in_hub', 'В разпределителен склад').status,
      ).toBe('IN_TRANSIT');
    });

    it('приета в офис също е моментът на предаване', () => {
      const r = service.toTrackingResult(
        {
          status_code: 'shipment_in_sorting_center',
          status: 'В сортировъчен център',
          tracking: [
            {
              status_code: 'shipment_registered',
              created_at: '2026-11-07T08:00:00Z',
            },
            {
              status_code: 'shipment_accepted_in_office',
              created_at: '2026-11-07T09:00:00Z',
            },
            {
              status_code: 'shipment_in_sorting_center',
              created_at: '2026-11-07T15:00:00Z',
            },
          ],
        },
        base,
        null,
      );
      expect(r.sentAt?.toISOString()).toBe('2026-11-07T09:00:00.000Z');
      // Only registered: nobody has taken it yet
      expect(
        service.toTrackingResult(
          {
            status_code: 'shipment_registered',
            tracking: [
              {
                status_code: 'shipment_registered',
                created_at: '2026-11-07T08:00:00Z',
              },
            ],
          },
          base,
          null,
        ).sentAt,
      ).toBeNull();
    });

    it('изплатен НП от отчета влиза в cod', () => {
      const r = service.toTrackingResult(
        {
          status_code: 'shipment_delivered_to_recipient',
          status: 'Взета от получателя',
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
            found: true,
            reference_number: 'PG1',
            status_code: 'shipment_courier_assigned',
            status: 'Взета от куриер',
            tracking: [],
          },
        ],
        ['PG2', { found: false, error: 'Пратката не е намерена.' }],
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
    expect(out.get('b')).toEqual({
      ok: false,
      error: 'Пратката не е намерена.',
    });
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
    // Refused because Pigeon already has it as cancelled: that is the goal
    cancel.mockRejectedValueOnce(
      new PigeonApiError(
        'Само новорегистрирани пратки могат да се отказват',
        422,
      ),
    );
    (api.track as jest.Mock).mockResolvedValueOnce({
      status_code: 'shipment_cancelled',
    });
    await expect(
      service.cancelShipment('c1', { shipmentNumber: 'PG1' }),
    ).resolves.toBeUndefined();
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

    // The key shown in the form is masked and coming back it changes nothing
    prisma.pigeonConfig.findUnique.mockResolvedValue({
      ...config,
      apiKey: 'pk_live_0123456789abcdef',
    });
    const shown = await service.getConfig('c1');
    expect(shown?.apiKey).toBe('pk_live_••••cdef');
    await service.updateConfig('c1', { apiKey: shown!.apiKey as string });
    expect(
      prisma.pigeonConfig.upsert.mock.calls[1][0].update.apiKey,
    ).toBeUndefined();

    await service.updateConfig('c1', { apiSecret: '••••••••' });
    expect(
      prisma.pigeonConfig.upsert.mock.calls[2][0].update.apiSecret,
    ).toBeUndefined();
  });
});
