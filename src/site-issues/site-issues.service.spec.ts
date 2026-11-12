import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SiteIssuesService, issueItemCost } from './site-issues.service';
import { PrismaService } from '../prisma/prisma.service';

const COMPANY = 'company-1';

const product = (over: any = {}) => ({
  id: 'prod-1',
  name: 'Кабел',
  sku: 'K1',
  type: 'PRODUCT',
  unit: 'PIECE',
  ...over,
});

const draft = (items: any[], over: any = {}) => ({
  id: 'si-1',
  companyId: COMPANY,
  issueNumber: 'SI-2026-00001',
  status: 'DRAFT',
  siteId: 'site-1',
  locationId: 'loc-1',
  items,
  ...over,
});

describe('SiteIssuesService', () => {
  let service: SiteIssuesService;
  let prisma: any;
  let tx: any;

  beforeEach(async () => {
    tx = {
      inventoryBatch: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({}),
      },
      inventorySerial: {
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      siteIssue: {
        update: jest.fn().mockImplementation(({ data }) => ({ ...data })),
        findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'si-1' }),
      },
      siteIssueItem: { update: jest.fn().mockResolvedValue({}) },
      siteIssueAllocation: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    prisma = {
      siteIssue: { findFirst: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        SiteIssuesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(SiteIssuesService);
  });

  describe('issue()', () => {
    it('обикновен продукт: FIFO през два складови реда, среднопретеглена цена', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(
        draft([
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 5,
            returnedQty: 0,
            inventoryBatchId: null,
            inventorySerialId: null,
            product: product(),
          },
        ]),
      );
      tx.inventoryBatch.findMany.mockResolvedValue([
        { id: 'b1', batchNumber: 'B1', quantity: 3, unitCost: 10 },
        { id: 'b2', batchNumber: 'B2', quantity: 10, unitCost: 20 },
      ]);

      await service.issue(COMPANY, 'si-1');

      // Търси само в склада на документа и само в рамките на фирмата
      expect(tx.inventoryBatch.findMany.mock.calls[0][0].where).toMatchObject({
        companyId: COMPANY,
        productId: 'prod-1',
        locationId: 'loc-1',
      });
      expect(tx.inventoryBatch.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'b1', quantity: { gte: 3 } },
        data: { quantity: { decrement: 3 } },
      });
      expect(tx.inventoryBatch.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'b2', quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 } },
      });
      expect(tx.siteIssueAllocation.create).toHaveBeenCalledTimes(2);
      // (3×10 + 2×20) / 5 = 14
      expect(tx.siteIssueItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { unitCost: 14 },
      });
      expect(tx.siteIssue.update.mock.calls[0][0].data.status).toBe('ISSUED');
    });

    it('недостиг: отказва и не пипа склада', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(
        draft([
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 5,
            returnedQty: 0,
            inventoryBatchId: null,
            inventorySerialId: null,
            product: product(),
          },
        ]),
      );
      tx.inventoryBatch.findMany.mockResolvedValue([
        { id: 'b1', batchNumber: 'B1', quantity: 4, unitCost: 10 },
      ]);

      await expect(service.issue(COMPANY, 'si-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.inventoryBatch.updateMany).not.toHaveBeenCalled();
      expect(tx.siteIssue.update).not.toHaveBeenCalled();
    });

    it('избрана партида: взима само от нея', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(
        draft([
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 2,
            returnedQty: 0,
            inventoryBatchId: 'b7',
            inventorySerialId: null,
            product: product({ type: 'BATCH' }),
          },
        ]),
      );
      tx.inventoryBatch.findMany.mockResolvedValue([
        { id: 'b7', batchNumber: 'LOT7', quantity: 9, unitCost: 5 },
      ]);

      await service.issue(COMPANY, 'si-1');

      expect(tx.inventoryBatch.findMany.mock.calls[0][0].where.id).toBe('b7');
      expect(tx.inventoryBatch.updateMany).toHaveBeenCalledTimes(1);
    });

    it('сериен: номерът става ON_SITE и цената му се снима', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(
        draft([
          {
            id: 'item-1',
            productId: 'prod-s',
            quantity: 1,
            returnedQty: 0,
            inventoryBatchId: null,
            inventorySerialId: 'sn-1',
            product: product({ id: 'prod-s', type: 'SERIAL' }),
          },
        ]),
      );
      tx.inventorySerial.findFirst.mockResolvedValue({
        id: 'sn-1',
        serialNumber: 'SN-0001',
        status: 'IN_STOCK',
        locationId: 'loc-1',
        unitCost: 250,
      });

      await service.issue(COMPANY, 'si-1');

      expect(tx.inventorySerial.updateMany).toHaveBeenCalledWith({
        where: { id: 'sn-1', status: 'IN_STOCK' },
        data: { status: 'ON_SITE' },
      });
      expect(tx.siteIssueItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { unitCost: 250 },
      });
      expect(tx.inventoryBatch.updateMany).not.toHaveBeenCalled();
    });

    it('сериен от друг склад или вече изписан: отказва', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(
        draft([
          {
            id: 'item-1',
            productId: 'prod-s',
            quantity: 1,
            returnedQty: 0,
            inventoryBatchId: null,
            inventorySerialId: 'sn-1',
            product: product({ id: 'prod-s', type: 'SERIAL' }),
          },
        ]),
      );
      tx.inventorySerial.findFirst.mockResolvedValue({
        id: 'sn-1',
        serialNumber: 'SN-0001',
        status: 'IN_STOCK',
        locationId: 'loc-other',
        unitCost: 250,
      });

      await expect(service.issue(COMPANY, 'si-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.inventorySerial.updateMany).not.toHaveBeenCalled();
    });

    it('вече изписан документ не се изписва втори път', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(
        draft([], { status: 'ISSUED' }),
      );
      await expect(service.issue(COMPANY, 'si-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('чуждо изписване → 404', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(null);
      await expect(service.issue(COMPANY, 'si-x')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.siteIssue.findFirst.mock.calls[0][0].where).toEqual({
        id: 'si-x',
        companyId: COMPANY,
      });
    });
  });

  describe('returnItems() / cancel()', () => {
    const issued = () =>
      draft(
        [
          {
            id: 'item-1',
            productId: 'prod-1',
            quantity: 5,
            returnedQty: 1,
            inventoryBatchId: null,
            inventorySerialId: null,
            product: product(),
          },
        ],
        { status: 'ISSUED' },
      );

    it('връща по разпределенията отзад напред', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(issued());
      // подредени desc: последно взетото е първо
      tx.siteIssueAllocation.findMany.mockResolvedValue([
        {
          id: 'a2',
          quantity: 2,
          returnedQty: 1,
          inventoryBatchId: 'b2',
          unitCost: 20,
        },
        {
          id: 'a1',
          quantity: 3,
          returnedQty: 0,
          inventoryBatchId: 'b1',
          unitCost: 10,
        },
      ]);

      await service.returnItems(COMPANY, 'si-1', {
        items: [{ itemId: 'item-1', quantity: 3 }],
      });

      expect(tx.inventoryBatch.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: 'b2', companyId: COMPANY },
        data: { quantity: { increment: 1 } },
      });
      expect(tx.inventoryBatch.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: 'b1', companyId: COMPANY },
        data: { quantity: { increment: 2 } },
      });
      expect(tx.siteIssueItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { returnedQty: { increment: 3 } },
      });
    });

    it('не връща повече от останалото на обекта', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(issued());
      await expect(
        service.returnItems(COMPANY, 'si-1', {
          items: [{ itemId: 'item-1', quantity: 4.5 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(tx.inventoryBatch.updateMany).not.toHaveBeenCalled();
    });

    it('ред от друго изписване се отказва', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(issued());
      await expect(
        service.returnItems(COMPANY, 'si-1', {
          items: [{ itemId: 'чужд', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('изтрит складов ред → връща се като нов ред в същия склад', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(issued());
      tx.siteIssueAllocation.findMany.mockResolvedValue([
        {
          id: 'alloc-0001',
          quantity: 5,
          returnedQty: 1,
          inventoryBatchId: null,
          unitCost: 12,
        },
      ]);

      await service.returnItems(COMPANY, 'si-1', {
        items: [{ itemId: 'item-1', quantity: 2 }],
      });

      expect(tx.inventoryBatch.create.mock.calls[0][0].data).toMatchObject({
        quantity: 2,
        unitCost: 12,
        companyId: COMPANY,
        productId: 'prod-1',
        locationId: 'loc-1',
      });
    });

    it('анулиране на изписано връща само невърнатото', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(issued());
      tx.siteIssueAllocation.findMany.mockResolvedValue([
        {
          id: 'a1',
          quantity: 5,
          returnedQty: 1,
          inventoryBatchId: 'b1',
          unitCost: 10,
        },
      ]);

      await service.cancel(COMPANY, 'si-1');

      expect(tx.inventoryBatch.updateMany).toHaveBeenCalledWith({
        where: { id: 'b1', companyId: COMPANY },
        data: { quantity: { increment: 4 } },
      });
      expect(tx.siteIssue.update.mock.calls[0][0].data.status).toBe(
        'CANCELLED',
      );
    });

    it('анулиране на чернова не пипа склада', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(draft([]));
      await service.cancel(COMPANY, 'si-1');
      expect(tx.inventoryBatch.updateMany).not.toHaveBeenCalled();
      expect(tx.siteIssueAllocation.findMany).not.toHaveBeenCalled();
    });

    it('анулиране връща серийния номер на склад', async () => {
      prisma.siteIssue.findFirst.mockResolvedValue(
        draft(
          [
            {
              id: 'item-1',
              productId: 'prod-s',
              quantity: 1,
              returnedQty: 0,
              inventoryBatchId: null,
              inventorySerialId: 'sn-1',
              product: product({ id: 'prod-s', type: 'SERIAL' }),
            },
          ],
          { status: 'ISSUED' },
        ),
      );
      await service.cancel(COMPANY, 'si-1');
      expect(tx.inventorySerial.updateMany).toHaveBeenCalledWith({
        where: { id: 'sn-1', companyId: COMPANY, status: 'ON_SITE' },
        data: { status: 'IN_STOCK' },
      });
    });
  });

  it('изтрива се само чернова', async () => {
    prisma.siteIssue.findFirst.mockResolvedValue(
      draft([], { status: 'ISSUED' }),
    );
    await expect(service.remove(COMPANY, 'si-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.siteIssue.delete).not.toHaveBeenCalled();
  });

  it('issueItemCost = (изписано − върнато) × цена', () => {
    expect(issueItemCost({ quantity: 5, returnedQty: 2, unitCost: 10.5 })).toBe(
      31.5,
    );
  });
});
