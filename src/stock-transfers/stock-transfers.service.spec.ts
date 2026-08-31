import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StockTransfersService } from './stock-transfers.service';
import { PrismaService } from '../prisma/prisma.service';

// Регресионни тестове за дупката, дублирала стока: трансфер БЕЗ избрана
// партида („Всички" / обикновен продукт) не изписваше нищо от източника
// при ship(), а receive() създаваше нов ред в дестинацията.

const COMPANY = 'company-1';

describe('StockTransfersService (FIFO без партида)', () => {
  let service: StockTransfersService;
  let prisma: any;
  let tx: any;

  const baseTransfer = {
    id: 'tr-1',
    companyId: COMPANY,
    transferNumber: 'ST-2026-00002',
    status: 'DRAFT',
    fromLocationId: 'loc-src',
    toLocationId: 'loc-dst',
    items: [
      {
        id: 'item-0001',
        productId: 'prod-book',
        quantity: 2,
        inventoryBatchId: null,
        inventoryBatch: null,
        serials: [],
      },
    ],
  };

  beforeEach(async () => {
    tx = {
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prod-book',
          name: 'Книга',
          type: 'PRODUCT',
        }),
      },
      inventoryBatch: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ unitCost: 10 }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      inventorySerial: { updateMany: jest.fn() },
      stockTransfer: {
        update: jest.fn().mockResolvedValue({ ...baseTransfer, status: 'SHIPPED' }),
      },
      stockTransferItem: { update: jest.fn().mockResolvedValue({}) },
      stockTransferSerial: { update: jest.fn() },
    };

    prisma = {
      stockTransfer: { findFirst: jest.fn() },
      $transaction: jest.fn((cb: (t: any) => Promise<unknown>) => cb(tx)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StockTransfersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(StockTransfersService);
  });

  it('ship() без партида изписва FIFO от редовете на изходната локация', async () => {
    prisma.stockTransfer.findFirst.mockResolvedValue({ ...baseTransfer });
    // Два реда по 1 бр. (двете доставки на книгата)
    tx.inventoryBatch.findMany.mockResolvedValue([
      { id: 'b-old', quantity: 1 },
      { id: 'b-new', quantity: 1 },
    ]);

    await service.ship(COMPANY, 'tr-1');

    // Търсенето е скопирано по компания/продукт/изходна локация
    expect(tx.inventoryBatch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: COMPANY,
          productId: 'prod-book',
          locationId: 'loc-src',
        }),
      }),
    );
    // И двата реда са намалени (1 + 1 = заявените 2)
    expect(tx.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: 'b-old' },
      data: { quantity: { decrement: 1 } },
    });
    expect(tx.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: 'b-new' },
      data: { quantity: { decrement: 1 } },
    });
  });

  it('ship() без партида отказва при недостатъчна наличност в източника', async () => {
    prisma.stockTransfer.findFirst.mockResolvedValue({ ...baseTransfer });
    tx.inventoryBatch.findMany.mockResolvedValue([{ id: 'b-old', quantity: 1 }]);

    await expect(service.ship(COMPANY, 'tr-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.inventoryBatch.update).not.toHaveBeenCalled();
  });

  it('receive() с частично приемане връща разликата в източника като нов ред', async () => {
    prisma.stockTransfer.findFirst.mockResolvedValue({
      ...baseTransfer,
      status: 'SHIPPED',
    });

    await service.receive(COMPANY, 'tr-1', {
      items: [{ itemId: 'item-0001', receivedQty: 1 }],
    } as any);

    // 1 бр. пристига в дестинацията
    expect(tx.inventoryBatch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locationId: 'loc-dst',
        quantity: 1,
      }),
    });
    // Разликата (1 бр.) се връща в източника — нов ред, не увеличение на nищо
    expect(tx.inventoryBatch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locationId: 'loc-src',
        quantity: 1,
        batchNumber: expect.stringContaining('ST-RET-'),
      }),
    });
  });
});
