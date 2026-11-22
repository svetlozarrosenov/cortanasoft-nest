import { Test } from '@nestjs/testing';
import { PosService } from './pos.service';
import { PosEventsService } from './pos-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';

const COMPANY = 'company-1';
const DEVICE = 'dev-1';

const products = [
  {
    id: 'p1',
    name: 'Боя',
    unit: 'PIECE',
    type: 'PRODUCT',
    salePrice: 10,
    vatRate: 20,
  },
  {
    id: 'p2',
    name: 'Колело',
    unit: 'PIECE',
    type: 'SERIAL',
    salePrice: 100,
    vatRate: 20,
  },
];

describe('PosService', () => {
  let service: PosService;
  let events: PosEventsService;
  let prisma: any;
  let orders: any;

  beforeEach(async () => {
    prisma = {
      fiscalDevice: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: DEVICE, locationId: 'loc-1' }),
      },
      product: {
        // Answers the "which of these are kept by serial number" lookup too
        findMany: jest
          .fn()
          .mockImplementation(({ where }) =>
            products.filter(
              (product) =>
                where.id.in.includes(product.id) &&
                (!where.type || product.type === where.type),
            ),
          ),
      },
      inventorySerial: { findMany: jest.fn().mockResolvedValue([]) },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn().mockImplementation((run) => run(prisma)),
      fiscalJob: {
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'job-1', ...data })),
        findFirst: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn(),
        // Read when a change is announced to the open cashier screens
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    orders = {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'ord-1', orderNumber: 'ORD-1', total: 24 }),
      update: jest.fn().mockResolvedValue({}),
    };
    const module = await Test.createTestingModule({
      providers: [
        PosService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersService, useValue: orders },
        PosEventsService,
      ],
    }).compile();
    service = module.get(PosService);
    events = module.get(PosEventsService);
  });

  const sale = {
    deviceId: DEVICE,
    paymentMethod: 'CARD' as const,
    items: [{ productId: 'p1', quantity: 2 }],
  };

  describe('createSale', () => {
    it('prices the sale from the products, not from the browser', async () => {
      await service.createSale(COMPANY, 'user-1', sale);
      const data = prisma.fiscalJob.create.mock.calls[0][0].data;
      expect(data.total).toBe(24);
      expect(data.receiptLines).toEqual([
        {
          name: 'Боя',
          vatGroup: 'B',
          unitPrice: '12.00',
          quantity: '2',
          unit: 'бр.',
        },
      ]);
      expect(data).toMatchObject({
        deviceId: DEVICE,
        companyId: COMPANY,
        createdById: 'user-1',
      });
    });

    it('creates no order: nothing is sold until the receipt is printed', async () => {
      await service.createSale(COMPANY, 'user-1', sale);
      expect(orders.create).not.toHaveBeenCalled();
    });

    it('refuses a second sale while the register is busy', async () => {
      prisma.fiscalJob.count.mockResolvedValue(1);
      await expect(
        service.createSale(COMPANY, 'user-1', sale),
      ).rejects.toMatchObject({
        response: { code: 'POS_DEVICE_BUSY' },
      });
    });

    it('checks for an open sale under a lock on the register', async () => {
      await service.createSale(COMPANY, 'user-1', sale);
      const lock = prisma.$executeRaw.mock.invocationCallOrder[0];
      const check = prisma.fiscalJob.count.mock.invocationCallOrder[0];
      const insert = prisma.fiscalJob.create.mock.invocationCallOrder[0];
      expect(lock).toBeLessThan(check);
      expect(check).toBeLessThan(insert);
    });

    it('refuses a sale whose prices no longer add up to what the cashier saw', async () => {
      await expect(
        service.createSale(COMPANY, 'user-1', {
          ...sale,
          expectedTotal: 23.99,
        }),
      ).rejects.toMatchObject({ response: { code: 'POS_TOTAL_CHANGED' } });
      await expect(
        service.createSale(COMPANY, 'user-1', { ...sale, expectedTotal: 24 }),
      ).resolves.toBeDefined();
    });

    it('refuses a device of another company', async () => {
      prisma.fiscalDevice.findFirst.mockResolvedValue(null);
      await expect(service.createSale(COMPANY, 'user-1', sale)).rejects.toThrow(
        'Fiscal device not found',
      );
    });

    it('refuses a product that is gone', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await expect(
        service.createSale(COMPANY, 'user-1', sale),
      ).rejects.toMatchObject({
        response: { code: 'POS_PRODUCT_UNAVAILABLE' },
      });
    });

    describe('a product kept by serial number', () => {
      const serialSale = {
        ...sale,
        items: [{ productId: 'p2', quantity: 1, serialId: 's1' }],
      };

      it('is refused without a chosen unit', async () => {
        await expect(
          service.createSale(COMPANY, 'user-1', {
            ...sale,
            items: [{ productId: 'p2', quantity: 1 }],
          }),
        ).rejects.toMatchObject({ response: { code: 'POS_SERIAL_REQUIRED' } });
      });

      it('is refused when the unit is not in the store of the register', async () => {
        await expect(
          service.createSale(COMPANY, 'user-1', serialSale),
        ).rejects.toMatchObject({
          response: { code: 'POS_SERIAL_UNAVAILABLE' },
        });
        expect(
          prisma.inventorySerial.findMany.mock.calls[0][0].where,
        ).toMatchObject({ status: 'IN_STOCK', locationId: 'loc-1' });
      });

      it('is refused when the same unit is on two lines', async () => {
        prisma.inventorySerial.findMany.mockResolvedValue([
          { id: 's1', serialNumber: 'SN-001', productId: 'p2' },
        ]);
        await expect(
          service.createSale(COMPANY, 'user-1', {
            ...sale,
            items: [serialSale.items[0], serialSale.items[0]],
          }),
        ).rejects.toMatchObject({
          response: { code: 'POS_SERIAL_UNAVAILABLE' },
        });
      });

      it('goes to the register with its serial number under the line', async () => {
        prisma.inventorySerial.findMany.mockResolvedValue([
          { id: 's1', serialNumber: 'SN-001', productId: 'p2' },
        ]);
        await service.createSale(COMPANY, 'user-1', serialSale);
        const data = prisma.fiscalJob.create.mock.calls[0][0].data;
        expect(data.receiptLines[0]).toMatchObject({
          name: 'Колело',
          note: 'S/N SN-001',
        });
        expect(data.items[0]).toMatchObject({
          inventorySerialId: 's1',
          serialNumber: 'SN-001',
        });
      });
    });

    it('wakes a register that is waiting for work', async () => {
      const waiting = service.nextJob(DEVICE, 20_000);
      await new Promise((resolve) => setImmediate(resolve));
      prisma.fiscalJob.findFirst.mockResolvedValue({ id: 'job-1' });
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 1 });
      prisma.fiscalJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        paymentMethod: 'CARD',
        total: 24,
        receiptLines: [],
      });

      await service.createSale(COMPANY, 'user-1', sale);

      await expect(waiting).resolves.toMatchObject({
        id: 'job-1',
        total: '24.00',
      });
    });
  });

  describe('nextJob', () => {
    it('hands nothing to a register that hung up while waiting', async () => {
      const gone = new AbortController();
      const waiting = service.nextJob(DEVICE, 20_000, gone.signal);
      await new Promise((resolve) => setImmediate(resolve));
      prisma.fiscalJob.findFirst.mockResolvedValue({ id: 'job-1' });

      gone.abort();

      await expect(waiting).resolves.toBeNull();
      expect(prisma.fiscalJob.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SENT' }),
        }),
      );
    });

    it('gives again a sale that never reached the register', async () => {
      // Handed out to a connection that died: still marked as sent
      prisma.fiscalJob.findFirst.mockImplementation(({ where }) =>
        where.status === 'SENT' ? { id: 'job-1' } : null,
      );
      prisma.fiscalJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-1',
        paymentMethod: 'CASH',
        total: 24,
        receiptLines: [],
      });

      await expect(service.nextJob(DEVICE, 0)).resolves.toMatchObject({
        id: 'job-1',
      });
      expect(prisma.fiscalJob.findFirst.mock.calls[0][0].where).toMatchObject({
        status: 'SENT',
        stage: null,
      });
    });
  });

  describe('reportResult', () => {
    const job = {
      id: 'job-1',
      companyId: COMPANY,
      createdById: 'user-1',
      paymentMethod: 'CARD',
      total: 24,
      receiptNumber: 77,
      items: [
        {
          productId: 'p1',
          name: 'Боя',
          quantity: 2,
          unitPrice: 10,
          vatRate: 20,
        },
      ],
      device: { name: 'Каса 1', locationId: 'loc-1' },
    };

    it('records the sale, the payment and the stock only after a printed receipt', async () => {
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 1 });
      prisma.fiscalJob.findUniqueOrThrow.mockResolvedValue(job);

      await service.reportResult(DEVICE, 'job-1', {
        status: 'SUCCEEDED',
        receiptNumber: 77,
      });

      expect(orders.create).toHaveBeenCalledWith(
        COMPANY,
        'user-1',
        expect.objectContaining({
          locationId: 'loc-1',
          autoConfirm: true,
          items: [
            {
              productId: 'p1',
              quantity: 2,
              unitPrice: 10,
              vatRate: 20,
              locationId: 'loc-1',
            },
          ],
          payments: [
            { amount: 24, method: 'CARD', reference: 'Фискален бон № 77' },
          ],
        }),
      );
      expect(prisma.fiscalJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { orderId: 'ord-1' },
      });
      expect(orders.update).toHaveBeenCalledWith(COMPANY, 'ord-1', {
        status: 'DELIVERED',
      });
    });

    it('takes the chosen unit out of stock with the sale', async () => {
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 1 });
      prisma.fiscalJob.findUniqueOrThrow.mockResolvedValue({
        ...job,
        items: [
          {
            productId: 'p2',
            name: 'Колело',
            quantity: 1,
            unitPrice: 100,
            vatRate: 20,
            inventorySerialId: 's1',
            serialNumber: 'SN-001',
          },
        ],
      });

      await service.reportResult(DEVICE, 'job-1', {
        status: 'SUCCEEDED',
        receiptNumber: 77,
      });

      const order = orders.create.mock.calls[0][2];
      expect(order.items[0]).toMatchObject({ inventorySerialId: 's1' });
      expect(order.notes).toBe('Фискален бон № 77, Каса 1');
    });

    it('says which products were sold without a serial number', async () => {
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 1 });
      prisma.fiscalJob.findUniqueOrThrow.mockResolvedValue({
        ...job,
        items: [
          ...job.items,
          {
            productId: 'p2',
            name: 'Колело',
            quantity: 1,
            unitPrice: 100,
            vatRate: 20,
          },
        ],
      });

      await service.reportResult(DEVICE, 'job-1', {
        status: 'SUCCEEDED',
        receiptNumber: 77,
      });

      expect(orders.create.mock.calls[0][2].notes).toBe(
        'Фискален бон № 77, Каса 1. Липсва сериен номер: Колело',
      );
    });

    it('records nothing for a failed sale', async () => {
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 1 });
      await service.reportResult(DEVICE, 'job-1', {
        status: 'FAILED',
        errorCode: 'CARD_DECLINED',
      });
      expect(orders.create).not.toHaveBeenCalled();
    });

    it('ignores a repeated report, so one receipt is never two sales', async () => {
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 0 });
      await service.reportResult(DEVICE, 'job-1', {
        status: 'SUCCEEDED',
        receiptNumber: 77,
      });
      expect(orders.create).not.toHaveBeenCalled();
    });

    it('tells the open cashier screens the outcome, without being asked', async () => {
      const heard: unknown[] = [];
      events.subscribe('c1', (event) => heard.push(event));
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 1 });
      prisma.fiscalJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'FAILED',
        companyId: 'c1',
      });

      await service.reportResult(DEVICE, 'job-1', {
        status: 'FAILED',
        errorCode: 'CARD_DECLINED',
      });

      expect(heard).toEqual([
        { type: 'sale', sale: { id: 'job-1', status: 'FAILED' } },
      ]);
    });

    it('tells nobody about a report it has already had', async () => {
      const heard: unknown[] = [];
      events.subscribe('c1', (event) => heard.push(event));
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 0 });

      await service.reportResult(DEVICE, 'job-1', { status: 'FAILED' });

      expect(heard).toEqual([]);
    });

    it('keeps the error when the receipt is printed but the sale cannot be recorded', async () => {
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 1 });
      prisma.fiscalJob.findUniqueOrThrow.mockResolvedValue(job);
      orders.create.mockRejectedValue(new Error('boom'));

      await expect(
        service.reportResult(DEVICE, 'job-1', {
          status: 'SUCCEEDED',
          receiptNumber: 77,
        }),
      ).resolves.toEqual({ ok: true });
      expect(prisma.fiscalJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { orderError: 'boom' },
      });
    });
  });

  describe('recordDeviceSale', () => {
    const report = {
      saleId: 'sale-uuid-1',
      paymentMethod: 'CASH' as const,
      total: 12,
      receiptNumber: 80,
      items: [
        {
          productId: 'p1',
          name: 'Боя',
          quantity: 1,
          unitPrice: 10,
          vatRate: 20,
        },
      ],
    };

    it('records the sale in the name of whoever paired the register', async () => {
      prisma.fiscalJob.create.mockResolvedValue({ id: 'job-9' });
      prisma.fiscalJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-9',
        companyId: COMPANY,
        createdById: null,
        paymentMethod: 'CASH',
        total: 12,
        receiptNumber: 80,
        items: report.items,
        device: { name: 'Каса 1', locationId: 'loc-1', pairedById: 'admin-1' },
      });
      orders.create.mockResolvedValue({
        id: 'ord-9',
        orderNumber: 'ORD-9',
        total: 12,
      });

      await service.recordDeviceSale(DEVICE, COMPANY, report);

      expect(prisma.fiscalJob.create.mock.calls[0][0].data).toMatchObject({
        status: 'SUCCEEDED',
        deviceSaleId: 'sale-uuid-1',
        deviceId: DEVICE,
        companyId: COMPANY,
      });
      expect(orders.create).toHaveBeenCalledWith(
        COMPANY,
        'admin-1',
        expect.objectContaining({
          locationId: 'loc-1',
          payments: [
            { amount: 12, method: 'CASH', reference: 'Фискален бон № 80' },
          ],
        }),
      );
    });

    it('dates an offline sale when it was made, not when it arrived', async () => {
      const soldAt = '2026-01-31T21:50:00.000Z';
      prisma.fiscalJob.create.mockResolvedValue({ id: 'job-9' });
      prisma.fiscalJob.findUniqueOrThrow.mockResolvedValue({
        id: 'job-9',
        companyId: COMPANY,
        createdById: null,
        deviceSaleId: 'sale-uuid-1',
        createdAt: new Date(soldAt),
        paymentMethod: 'CASH',
        total: 12,
        receiptNumber: 80,
        items: report.items,
        device: { name: 'Каса 1', locationId: 'loc-1', pairedById: 'admin-1' },
      });

      await service.recordDeviceSale(DEVICE, COMPANY, { ...report, soldAt });

      expect(prisma.fiscalJob.create.mock.calls[0][0].data.createdAt).toEqual(
        new Date(soldAt),
      );
      const order = orders.create.mock.calls[0][2];
      expect(order.orderDate).toBe(soldAt);
      expect(order.payments[0].paidAt).toBe(soldAt);
    });

    it('ignores a sale it has already recorded', async () => {
      prisma.fiscalJob.findFirst.mockResolvedValue({ id: 'job-9' });
      await service.recordDeviceSale(DEVICE, COMPANY, report);
      expect(prisma.fiscalJob.create).not.toHaveBeenCalled();
      expect(orders.create).not.toHaveBeenCalled();
    });
  });

  describe('catalog', () => {
    it('gives prices without VAT and the VAT group of each product', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Боя',
          sku: 'B1',
          barcode: null,
          unit: 'KG',
          salePrice: 10,
          vatRate: 20,
          categoryId: 'c1',
        },
        {
          id: 'p2',
          name: 'Странна',
          sku: 'S1',
          barcode: null,
          unit: 'PIECE',
          salePrice: 1,
          vatRate: 7,
          categoryId: null,
        },
      ]);
      prisma.productCategory = {
        findMany: jest.fn().mockResolvedValue([{ id: 'c1', name: 'Бои' }]),
      };

      const catalog = await service.catalog(COMPANY);

      expect(catalog.categories).toEqual([{ id: 'c1', name: 'Бои' }]);
      expect(catalog.products[0]).toMatchObject({
        unitPrice: '10.00',
        vatRate: 20,
        vatGroup: 'B',
        unit: 'кг',
      });
      expect(catalog.products[1].vatGroup).toBeNull();
    });
  });

  describe('receipt copy', () => {
    it('keeps the text the register read back from its journal', async () => {
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 1 });

      await service.reportResult(DEVICE, 'job-1', {
        status: 'FAILED',
        receiptText: ['  SHOP', 'TOTAL  1.00'],
      });

      expect(prisma.fiscalJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ receiptText: '  SHOP\nTOTAL  1.00' }),
        }),
      );
    });

    it('gives a sale its receipt line by line', async () => {
      prisma.fiscalJob.findFirst.mockResolvedValue({
        receiptNumber: 94,
        receiptDateTime: '22-11-26 14:36:44',
        fiscalMemoryNumber: '79075232',
        receiptText: '  SHOP\n\nTOTAL  1.00',
        total: 1,
        device: { name: 'Till 1', serialNumber: 'DA075232' },
      });

      await expect(service.orderReceipt('c1', 'order-1')).resolves.toEqual({
        receiptNumber: 94,
        receiptDateTime: '22-11-26 14:36:44',
        fiscalMemoryNumber: '79075232',
        deviceName: 'Till 1',
        deviceSerialNumber: 'DA075232',
        lines: ['  SHOP', '', 'TOTAL  1.00'],
        // No line with the receipt's number and date to build the code from
        qr: null,
      });
      expect(prisma.fiscalJob.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'c1',
            orderId: 'order-1',
          }),
        }),
      );
    });

    it('rebuilds the QR code printed on the paper receipt', async () => {
      prisma.fiscalJob.findFirst.mockResolvedValue({
        receiptNumber: 94,
        receiptDateTime: '22-11-26 14:36:44',
        fiscalMemoryNumber: '79075232',
        receiptText: [
          'В БРОЙ ЕВРО                12.00',
          '',
          '0000094     22-11-2026  14:36:42',
          '          ФИСКАЛЕН БОН',
        ].join('\n'),
        total: 12,
        device: { name: 'Till 1', serialNumber: 'DA075232' },
      });

      const receipt = await service.orderReceipt('c1', 'order-1');

      // Read off the paper receipt this text was copied from
      expect(receipt?.qr?.text).toBe(
        '79075232*0000094*2026-11-22*14:36:42*12.00',
      );
      expect(receipt?.qr?.afterLine).toBe(2);
      expect(receipt?.qr?.image).toMatch(/^data:image\/png;base64,/);
    });

    it('has nothing for a sale that did not go through a register', async () => {
      prisma.fiscalJob.findFirst.mockResolvedValue(null);

      await expect(service.orderReceipt('c1', 'order-1')).resolves.toBeNull();
    });
  });

  describe('cancelSale', () => {
    it('refuses once the register has started', async () => {
      prisma.fiscalJob.updateMany.mockResolvedValue({ count: 0 });
      prisma.fiscalJob.count.mockResolvedValue(1);
      await expect(service.cancelSale(COMPANY, 'job-1')).rejects.toMatchObject({
        response: { code: 'POS_ALREADY_STARTED' },
      });
    });
  });
});
