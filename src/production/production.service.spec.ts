import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductionService } from './production.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  productionOrder: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  inventoryBatch: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  location: {
    findFirst: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
  productionConsumption: {
    create: jest.fn(),
  },
  productionMaterialIssuance: {
    create: jest.fn(),
  },
  $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

describe('ProductionService', () => {
  let service: ProductionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ProductionService>(ProductionService);
  });

  // Завършването на производство пълни партида: нова или ДОЛИВА в съществуваща
  // (клиенти като AdBlue производителите пълнят една партида с дневни
  // производства). outputBatchId записва в коя партида е излял резултатът —
  // паспортът на партидата стъпва на него.
  describe('complete', () => {
    const makeOrder = (overrides = {}) => ({
      id: 'po1',
      orderNumber: 'PRD-2026-00001',
      quantity: 40000,
      status: 'IN_PROGRESS',
      locationId: 'loc1',
      productId: 'p1',
      product: { id: 'p1', name: 'ADBLUE', shelfLifeDays: 365 },
      issuances: [
        { quantity: 20000, unitCost: 0.5 },
        { quantity: 20000, unitCost: 0 },
      ],
      ...overrides,
    });

    it('should throw when order is not IN_PROGRESS', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue(
        makeOrder({ status: 'COMPLETED' }),
      );
      await expect(service.complete('c1', 'po1')).rejects.toThrow(BadRequestException);
    });

    it('should refuse to complete with zero issued materials', async () => {
      // Рецептата е опционална, материалите — не: без изписване няма
      // себестойност и паспортът на партидата е празен.
      mockPrisma.productionOrder.findFirst.mockResolvedValue(
        makeOrder({ issuances: [] }),
      );
      await expect(service.complete('c1', 'po1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.inventoryBatch.create).not.toHaveBeenCalled();
      expect(mockPrisma.productionOrder.update).not.toHaveBeenCalled();
    });

    it('should create a new batch and link it via outputBatchId', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.inventoryBatch.findUnique.mockResolvedValue(null); // няма такава партида
      mockPrisma.inventoryBatch.create.mockResolvedValue({ id: 'batch-new' });
      mockPrisma.productionOrder.update.mockResolvedValue({ id: 'po1', status: 'COMPLETED' });

      await service.complete('c1', 'po1', { batchNumber: '1208-250826' });

      expect(mockPrisma.inventoryBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          batchNumber: '1208-250826',
          quantity: 40000,
          initialQty: 40000,
          unitCost: 0.25, // 20000*0.5 / 40000
          productId: 'p1',
          locationId: 'loc1',
          productionOrderId: 'po1',
        }),
      });
      expect(mockPrisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            outputBatchId: 'batch-new',
          }),
        }),
      );
    });

    it('should top up an existing batch of the SAME product instead of failing', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.inventoryBatch.findUnique.mockResolvedValue({
        id: 'batch-existing',
        initialQty: 200000,
        unitCost: 0.5,
      });
      mockPrisma.inventoryBatch.update.mockResolvedValue({});
      mockPrisma.productionOrder.update.mockResolvedValue({ id: 'po1', status: 'COMPLETED' });

      await service.complete('c1', 'po1', { batchNumber: '1208-250826' });

      // Търсенето е по компания+ПРОДУКТ+номер — партида на друг продукт със
      // същото име никога не може да бъде долята.
      expect(mockPrisma.inventoryBatch.findUnique).toHaveBeenCalledWith({
        where: {
          companyId_productId_batchNumber: {
            companyId: 'c1',
            productId: 'p1',
            batchNumber: '1208-250826',
          },
        },
      });
      expect(mockPrisma.inventoryBatch.create).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryBatch.update).toHaveBeenCalledWith({
        where: { id: 'batch-existing' },
        data: expect.objectContaining({
          quantity: { increment: 40000 },
          initialQty: { increment: 40000 },
          // (200000*0.5 + 40000*0.25) / 240000
          unitCost: (200000 * 0.5 + 40000 * 0.25) / 240000,
        }),
      });
      expect(mockPrisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outputBatchId: 'batch-existing' }),
        }),
      );
    });

    it('should NOT touch batch dates on top-up when the dto has none', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.inventoryBatch.findUnique.mockResolvedValue({
        id: 'batch-existing',
        initialQty: 200000,
        unitCost: 0.5,
      });
      mockPrisma.inventoryBatch.update.mockResolvedValue({});
      mockPrisma.productionOrder.update.mockResolvedValue({});

      await service.complete('c1', 'po1', { batchNumber: '1208-250826' });

      const updateData = mockPrisma.inventoryBatch.update.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('manufacturingDate');
      expect(updateData).not.toHaveProperty('expiryDate');
    });

    it('should apply dto dates on top-up when the operator changed them', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.inventoryBatch.findUnique.mockResolvedValue({
        id: 'batch-existing',
        initialQty: 200000,
        unitCost: 0.5,
      });
      mockPrisma.inventoryBatch.update.mockResolvedValue({});
      mockPrisma.productionOrder.update.mockResolvedValue({});

      await service.complete('c1', 'po1', {
        batchNumber: '1208-250826',
        expiryDate: '2027-08-23',
      });

      const updateData = mockPrisma.inventoryBatch.update.mock.calls[0][0].data;
      expect(updateData.expiryDate).toEqual(new Date('2027-08-23'));
    });

    it('should leave outputBatchId null when no batch is created (no location)', async () => {
      // Непартиден резултат / липсваща локация → не се заприхожда партида,
      // а outputBatchId ОСТАВА ПРАЗЕН — полето е nullable по дизайн.
      mockPrisma.productionOrder.findFirst.mockResolvedValue(
        makeOrder({ locationId: null }),
      );
      mockPrisma.location.findFirst.mockResolvedValue(null); // няма и default локация
      mockPrisma.productionOrder.update.mockResolvedValue({ id: 'po1', status: 'COMPLETED' });

      await service.complete('c1', 'po1');

      expect(mockPrisma.inventoryBatch.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryBatch.create).not.toHaveBeenCalled();
      expect(mockPrisma.productionOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ outputBatchId: null }),
        }),
      );
    });

    it('should default the batch number to the order number', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.inventoryBatch.findUnique.mockResolvedValue(null);
      mockPrisma.inventoryBatch.create.mockResolvedValue({ id: 'batch-new' });
      mockPrisma.productionOrder.update.mockResolvedValue({});

      await service.complete('c1', 'po1'); // без dto

      expect(mockPrisma.inventoryBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ batchNumber: 'PRD-2026-00001' }),
      });
    });
  });

  describe('getExistingBatches', () => {
    it('should throw when the order does not exist', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue(null);
      await expect(service.getExistingBatches('c1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should return only PRODUCED batches of the order product', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue({ productId: 'p1' });
      mockPrisma.inventoryBatch.findMany.mockResolvedValue([]);

      await service.getExistingBatches('c1', 'po1');

      // Само произведени партиди (не доставни) и само на СЪЩИЯ продукт —
      // предложенията в UI-а не могат да предизвикат смесване на продукти.
      expect(mockPrisma.inventoryBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'c1',
            productId: 'p1',
            productionOrderId: { not: null },
          }),
        }),
      );
    });
  });

  // Ръчно изписване без рецепта: потребителят може да посочи от кои партиди
  // взима материала; иначе — FIFO както досега.
  describe('issueMaterial', () => {
    const inProgress = { id: 'po1', status: 'IN_PROGRESS', locationId: 'loc1' };

    beforeEach(() => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue(inProgress);
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'm1',
        name: 'Фолио',
      });
      mockPrisma.productionMaterialIssuance.create.mockResolvedValue({
        id: 'iss1',
      });
    });

    it('should deduct from the batches the user picked', async () => {
      mockPrisma.inventoryBatch.findFirst
        .mockResolvedValueOnce({
          id: 'b1',
          batchNumber: 'A',
          quantity: 10,
          unitCost: 2,
        })
        .mockResolvedValueOnce({
          id: 'b2',
          batchNumber: 'B',
          quantity: 10,
          unitCost: 4,
        });

      await service.issueMaterial('c1', 'po1', 'u1', {
        productId: 'm1',
        quantity: 6,
        batches: [
          { inventoryBatchId: 'b1', quantity: 2 },
          { inventoryBatchId: 'b2', quantity: 4 },
        ],
      });

      expect(mockPrisma.inventoryBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { quantity: 8 },
      });
      expect(mockPrisma.inventoryBatch.update).toHaveBeenCalledWith({
        where: { id: 'b2' },
        data: { quantity: 6 },
      });
      // FIFO търсенето не се ползва при ръчен избор
      expect(mockPrisma.inventoryBatch.findMany).not.toHaveBeenCalled();
      // Себестойността е претеглена по реално взетите партиди: (2·2 + 4·4) / 6
      expect(mockPrisma.productionMaterialIssuance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantity: 6, unitCost: 20 / 6 }),
        }),
      );
    });

    it('should reject picked batches that do not add up to the quantity', async () => {
      await expect(
        service.issueMaterial('c1', 'po1', 'u1', {
          productId: 'm1',
          quantity: 6,
          batches: [{ inventoryBatchId: 'b1', quantity: 2 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.inventoryBatch.update).not.toHaveBeenCalled();
    });

    it('should fall back to FIFO when no batches are picked', async () => {
      mockPrisma.inventoryBatch.findMany.mockResolvedValue([
        { id: 'b1', batchNumber: 'A', quantity: 10, unitCost: 2 },
      ]);

      await service.issueMaterial('c1', 'po1', 'u1', {
        productId: 'm1',
        quantity: 6,
      });

      expect(mockPrisma.inventoryBatch.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { quantity: 4 },
      });
    });
  });

  describe('getMaterialBatches', () => {
    it('should list only batches with stock at the order location, oldest first', async () => {
      mockPrisma.productionOrder.findFirst.mockResolvedValue({
        locationId: 'loc1',
      });
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'm1',
        name: 'Фолио',
        type: 'BATCH',
        unit: 'KG',
      });
      mockPrisma.inventoryBatch.findMany.mockResolvedValue([
        {
          id: 'b1',
          batchNumber: 'A',
          quantity: 2.5,
          expiryDate: null,
          location: { name: 'Склад' },
        },
        {
          id: 'b2',
          batchNumber: 'B',
          quantity: 4,
          expiryDate: null,
          location: null,
        },
      ]);

      const result = await service.getMaterialBatches('c1', 'po1', 'm1');

      expect(mockPrisma.inventoryBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            companyId: 'c1',
            productId: 'm1',
            quantity: { gt: 0 },
            locationId: 'loc1',
          },
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(result.totalAvailable).toBe(6.5);
      expect(result.availableBatches.map((b) => b.id)).toEqual(['b1', 'b2']);
    });
  });
});
