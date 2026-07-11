import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma: any = {
  priceList: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  priceListItem: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('PriceListsService', () => {
  let service: PriceListsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceListsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<PriceListsService>(PriceListsService);
  });

  describe('create', () => {
    it('should reject duplicate name within the company', async () => {
      mockPrisma.priceList.findFirst.mockResolvedValue({ id: 'pl1' });
      await expect(
        service.create('c1', { name: 'ВИП' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create with isActive defaulting to true', async () => {
      mockPrisma.priceList.findFirst.mockResolvedValue(null);
      mockPrisma.priceList.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pl1', ...data }),
      );
      const result = await service.create('c1', { name: 'ВИП' } as any);
      expect(result.isActive).toBe(true);
      expect(result.companyId).toBe('c1');
    });
  });

  describe('upsertItem', () => {
    it('should reject product from another company (IDOR)', async () => {
      mockPrisma.priceList.findFirst.mockResolvedValue({ id: 'pl1' });
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.upsertItem('c1', 'pl1', { productId: 'foreign', price: 10 }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.priceListItem.upsert).not.toHaveBeenCalled();
    });

    it('should upsert by [priceListId, productId]', async () => {
      mockPrisma.priceList.findFirst.mockResolvedValue({ id: 'pl1' });
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.priceListItem.upsert.mockResolvedValue({});
      await service.upsertItem('c1', 'pl1', { productId: 'p1', price: 99.5 });
      expect(mockPrisma.priceListItem.upsert).toHaveBeenCalledWith({
        where: {
          priceListId_productId: { priceListId: 'pl1', productId: 'p1' },
        },
        create: { priceListId: 'pl1', productId: 'p1', price: 99.5 },
        update: { price: 99.5 },
      });
    });
  });

  describe('assignCustomer', () => {
    it('should set priceListId on the customer', async () => {
      mockPrisma.priceList.findFirst.mockResolvedValue({ id: 'pl1' });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust1' });
      mockPrisma.customer.update.mockResolvedValue({});
      await service.assignCustomer('c1', 'pl1', 'cust1');
      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust1' },
        data: { priceListId: 'pl1' },
      });
    });

    it('should reject customer from another company (IDOR)', async () => {
      mockPrisma.priceList.findFirst.mockResolvedValue({ id: 'pl1' });
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.assignCustomer('c1', 'pl1', 'foreign'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('getEffectivePrices', () => {
    it('should return the customer price list items', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust1',
        priceList: {
          id: 'pl1',
          name: 'ВИП',
          isActive: true,
          items: [
            { productId: 'p1', price: 90 },
            { productId: 'p2', price: 45.5 },
          ],
        },
      });
      const result = await service.getEffectivePrices('c1', 'cust1');
      expect(result.priceListId).toBe('pl1');
      expect(result.prices).toEqual([
        { productId: 'p1', price: 90 },
        { productId: 'p2', price: 45.5 },
      ]);
    });

    it('should return empty prices when customer has no list', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust1',
        priceList: null,
      });
      const result = await service.getEffectivePrices('c1', 'cust1');
      expect(result.priceListId).toBeNull();
      expect(result.prices).toEqual([]);
    });

    it('should ignore an inactive price list', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust1',
        priceList: { id: 'pl1', name: 'Стара', isActive: false, items: [{ productId: 'p1', price: 1 }] },
      });
      const result = await service.getEffectivePrices('c1', 'cust1');
      expect(result.priceListId).toBeNull();
      expect(result.prices).toEqual([]);
    });

    it('should throw for a customer of another company (IDOR)', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      await expect(
        service.getEffectivePrices('c1', 'foreign'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
