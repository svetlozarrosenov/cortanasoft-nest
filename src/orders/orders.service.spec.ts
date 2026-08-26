import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { WarrantiesService } from '../warranties/warranties.service';
import { PaymentsService } from '../payments/payments.service';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

// Collaborator services — no-op мокове; тестовете покриват ядрото на OrdersService
const mockWarranties = {
  createWarrantiesForOrder: jest.fn(),
  voidWarrantiesForOrder: jest.fn(),
};
const mockPayments = { syncPaymentsFromStatus: jest.fn() };
const mockWebhooks = { emitOrderChanged: jest.fn().mockResolvedValue(undefined) };
// Service-ът виква .catch() върху резултата → моковете трябва да връщат Promise
const mockPush = {
  sendToUser: jest.fn().mockResolvedValue(undefined),
  sendToCompany: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  order: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  location: {
    findFirst: jest.fn(),
  },
  inventoryBatch: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  orderItem: {
    update: jest.fn(),
  },
  orderItemBatchAllocation: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset $transaction to call the callback with mockPrisma
    mockPrisma.$transaction.mockImplementation((cb: any) => cb(mockPrisma));
    // Defaults за партидните разпределения и редовете на поръчката
    mockPrisma.orderItem.update.mockResolvedValue({});
    mockPrisma.orderItemBatchAllocation.findMany.mockResolvedValue([]);
    mockPrisma.orderItemBatchAllocation.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.orderItemBatchAllocation.deleteMany.mockResolvedValue({ count: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WarrantiesService, useValue: mockWarranties },
        { provide: PaymentsService, useValue: mockPayments },
        { provide: WebhookDispatcherService, useValue: mockWebhooks },
        { provide: PushNotificationsService, useValue: mockPush },
      ],
    }).compile();
    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    const baseDto = {
      customerName: 'Client',
      items: [{ productId: 'p1', quantity: 10, unitPrice: 100 }],
    };

    it('should throw BadRequestException when no items', async () => {
      await expect(service.create('c1', 'u1', { items: [] } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when company not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      await expect(service.create('c1', 'u1', baseDto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when location not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'c1', vatNumber: 'BG123' });
      mockPrisma.location.findFirst.mockResolvedValue(null);

      await expect(
        service.create('c1', 'u1', { ...baseDto, locationId: 'bad-loc' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when products not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'c1', vatNumber: null });
      mockPrisma.product.findMany.mockResolvedValue([]); // no products found

      await expect(service.create('c1', 'u1', baseDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should use 20% VAT when company has vatNumber', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'c1', vatNumber: 'BG123', currencyId: 'cur1' });
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', vatRate: 20 }]);
      mockPrisma.order.findFirst.mockResolvedValue(null); // for generateOrderNumber
      mockPrisma.order.create.mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));

      const result = await service.create('c1', 'u1', baseDto as any);
      // 10 * 100 = 1000 subtotal, 1000 * 0.20 = 200 VAT
      expect(result.subtotal).toBe(1000);
      expect(result.vatAmount).toBe(200);
      expect(result.total).toBe(1200);
    });

    it('should use 0% VAT when company has no vatNumber', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'c1', vatNumber: null, currencyId: 'cur1' });
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', vatRate: 0 }]);
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.order.create.mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));

      const result = await service.create('c1', 'u1', baseDto as any);
      expect(result.vatAmount).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('should use explicit item.vatRate when provided', async () => {
      const dto = {
        customerName: 'Client',
        items: [{ productId: 'p1', quantity: 10, unitPrice: 100, vatRate: 9 }],
      };
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'c1', vatNumber: 'BG123', currencyId: 'cur1' });
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', vatRate: 20 }]);
      mockPrisma.order.findFirst.mockResolvedValue(null);
      mockPrisma.order.create.mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));

      const result = await service.create('c1', 'u1', dto as any);
      // 10 * 100 = 1000, VAT = 1000 * 0.09 = 90
      expect(result.vatAmount).toBe(90);
    });

    it('should generate order number correctly', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({ id: 'c1', vatNumber: null, currencyId: 'cur1' });
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', vatRate: 0 }]);
      mockPrisma.order.findFirst.mockResolvedValue({ orderNumber: `ORD-${new Date().getFullYear()}-00003` });
      mockPrisma.order.create.mockImplementation(({ data }) => Promise.resolve({ id: '1', ...data }));

      const result = await service.create('c1', 'u1', baseDto as any);
      expect(result.orderNumber).toBe(`ORD-${new Date().getFullYear()}-00004`);
    });
  });

  describe('confirm', () => {
    const makeOrder = (overrides = {}) => ({
      id: 'o1',
      companyId: 'c1',
      status: 'PENDING',
      locationId: 'loc1',
      items: [
        { id: 'i1', productId: 'p1', quantity: 30, inventoryBatchId: 'b1' },
      ],
      ...overrides,
    });

    it('should throw BadRequestException when confirming non-PENDING order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ status: 'CONFIRMED' }));
      await expect(service.confirm('c1', 'o1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when confirming order with no items', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ items: [] }));
      await expect(service.confirm('c1', 'o1')).rejects.toThrow(BadRequestException);
    });

    it('should deduct inventory from specific batch', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'A', type: 'PRODUCT', trackInventory: true });
      mockPrisma.inventoryBatch.findFirst.mockResolvedValue({ id: 'b1', quantity: 100, batchNumber: 'B-001' });
      mockPrisma.inventoryBatch.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({ ...makeOrder(), status: 'CONFIRMED' });

      await service.confirm('c1', 'o1');

      // Атомарен decrement вместо изчислено ново количество
      expect(mockPrisma.inventoryBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { quantity: { decrement: 30 } },
      });
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { stockDeducted: true },
      });
    });

    it('should FIFO deduct across multiple batches', async () => {
      const order = makeOrder({
        items: [{ id: 'i1', productId: 'p1', quantity: 25, inventoryBatchId: null }],
      });
      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'A', type: 'PRODUCT', trackInventory: true });
      mockPrisma.inventoryBatch.findMany.mockResolvedValue([
        { id: 'b1', quantity: 10, batchNumber: 'B-001', createdAt: new Date('2024-01-01') },
        { id: 'b2', quantity: 30, batchNumber: 'B-002', createdAt: new Date('2024-02-01') },
      ]);
      mockPrisma.inventoryBatch.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CONFIRMED' });

      await service.confirm('c1', 'o1');

      // b1: -10 (depleted), b2: -15 — атомарни decrement-и
      expect(mockPrisma.inventoryBatch.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventoryBatch.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'b1' },
        data: { quantity: { decrement: 10 } },
      });
      expect(mockPrisma.inventoryBatch.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'b2' },
        data: { quantity: { decrement: 15 } },
      });
      // Разпределенията се записват за точното връщане при cancel
      expect(mockPrisma.orderItemBatchAllocation.createMany).toHaveBeenCalledWith({
        data: [
          { orderItemId: 'i1', inventoryBatchId: 'b1', batchNumber: 'B-001', quantity: 10 },
          { orderItemId: 'i1', inventoryBatchId: 'b2', batchNumber: 'B-002', quantity: 15 },
        ],
      });
    });

    it('should throw BadRequestException for insufficient stock (specific batch)', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'A', type: 'PRODUCT', trackInventory: true });
      mockPrisma.inventoryBatch.findFirst.mockResolvedValue({ id: 'b1', quantity: 5 }); // only 5, need 30

      await expect(service.confirm('c1', 'o1')).rejects.toThrow(BadRequestException);
    });

    it('should backorder (not throw) on insufficient FIFO stock', async () => {
      // Нова семантика: недостигът вече не блокира потвърждаването — редът
      // остава неизписан (stockDeducted=false, „Очакват изписване“).
      const order = makeOrder({
        items: [{ id: 'i1', productId: 'p1', quantity: 100, inventoryBatchId: null }],
      });
      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'A', type: 'PRODUCT', trackInventory: true });
      mockPrisma.inventoryBatch.findMany.mockResolvedValue([
        { id: 'b1', quantity: 20 },
        { id: 'b2', quantity: 30 },
      ]); // total 50, need 100
      mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CONFIRMED' });

      await service.confirm('c1', 'o1');

      expect(mockPrisma.inventoryBatch.update).not.toHaveBeenCalled();
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { stockDeducted: false },
      });
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CONFIRMED' } }),
      );
    });

    it('should skip inventory deduction for SERVICE products', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', type: 'SERVICE', trackInventory: false });
      mockPrisma.order.update.mockResolvedValue({ status: 'CONFIRMED' });

      await service.confirm('c1', 'o1');
      expect(mockPrisma.inventoryBatch.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryBatch.findMany).not.toHaveBeenCalled();
    });

    it('should skip inventory deduction for non-tracked products', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', type: 'PRODUCT', trackInventory: false });
      mockPrisma.order.update.mockResolvedValue({ status: 'CONFIRMED' });

      await service.confirm('c1', 'o1');
      expect(mockPrisma.inventoryBatch.update).not.toHaveBeenCalled();
    });

    it('should throw when specific batch not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', name: 'A', type: 'PRODUCT', trackInventory: true });
      mockPrisma.inventoryBatch.findFirst.mockResolvedValue(null);

      await expect(service.confirm('c1', 'o1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    // stockDeducted: true — при confirm стоката е била изписана и подлежи на връщане
    const makeOrder = (overrides = {}) => ({
      id: 'o1',
      companyId: 'c1',
      status: 'CONFIRMED',
      locationId: 'loc1',
      items: [
        { id: 'i1', productId: 'p1', quantity: 30, inventoryBatchId: 'b1', stockDeducted: true },
      ],
      ...overrides,
    });

    it('should throw BadRequestException when cancelling already CANCELLED order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ status: 'CANCELLED' }));
      await expect(service.cancel('c1', 'o1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cancelling DELIVERED order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ status: 'DELIVERED' }));
      await expect(service.cancel('c1', 'o1')).rejects.toThrow(BadRequestException);
    });

    it('should restore inventory to specific batch on cancel', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', type: 'PRODUCT', trackInventory: true });
      mockPrisma.inventoryBatch.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({ status: 'CANCELLED' });

      await service.cancel('c1', 'o1');

      // Атомарен increment към конкретната партида
      expect(mockPrisma.inventoryBatch.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { quantity: { increment: 30 } },
      });
    });

    it('should restore inventory to oldest batch (FIFO) when no specific batch', async () => {
      const order = makeOrder({
        items: [{ id: 'i1', productId: 'p1', quantity: 20, inventoryBatchId: null, stockDeducted: true }],
      });
      mockPrisma.order.findFirst.mockResolvedValue(order);
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', type: 'PRODUCT', trackInventory: true });
      mockPrisma.inventoryBatch.findFirst.mockResolvedValue({ id: 'b-oldest', quantity: 50 });
      mockPrisma.inventoryBatch.update.mockResolvedValue({});
      mockPrisma.order.update.mockResolvedValue({ status: 'CANCELLED' });

      await service.cancel('c1', 'o1');

      expect(mockPrisma.inventoryBatch.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
      expect(mockPrisma.inventoryBatch.update).toHaveBeenCalledWith({
        where: { id: 'b-oldest' },
        data: { quantity: { increment: 20 } },
      });
    });

    it('should NOT restore inventory when cancelling PENDING order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder({ status: 'PENDING' }));
      mockPrisma.order.update.mockResolvedValue({ status: 'CANCELLED' });

      await service.cancel('c1', 'o1');

      expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryBatch.update).not.toHaveBeenCalled();
    });

    it('should skip restore for SERVICE products', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder());
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', type: 'SERVICE', trackInventory: false });
      mockPrisma.order.update.mockResolvedValue({ status: 'CANCELLED' });

      await service.cancel('c1', 'o1');
      expect(mockPrisma.inventoryBatch.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete PENDING order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', status: 'PENDING' });
      mockPrisma.order.delete.mockResolvedValue({});

      const result = await service.remove('c1', 'o1');
      expect(mockPrisma.order.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
    });

    it('should throw BadRequestException when deleting non-PENDING order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ id: 'o1', status: 'CONFIRMED' });
      await expect(service.remove('c1', 'o1')).rejects.toThrow(BadRequestException);
    });
  });
});
