import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  productCategory: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const dto = { sku: 'SKU001', name: 'Test', salePrice: 100, vatRate: 20 };
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({ id: '1', ...dto });

      const result = await service.create('c1', 'u1', dto as any);
      expect(result.sku).toBe('SKU001');
    });

    it('should throw ConflictException for duplicate SKU in same company', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('c1', 'u1', { sku: 'SKU001', name: 'Test', salePrice: 100, vatRate: 20 } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException for non-existent category', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.productCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.create('c1', 'u1', { sku: 'SKU001', name: 'Test', salePrice: 100, categoryId: 'bad', vatRate: 20 } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set vatRate to 20 when company has vatNumber and dto.vatRate is undefined', async () => {
      const dto = { sku: 'SKU001', name: 'Test', salePrice: 100 };
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue({ vatNumber: 'BG123456789', currencyId: 'cur1' });
      mockPrisma.product.create.mockResolvedValue({ id: '1', ...dto, vatRate: 20 });

      await service.create('c1', 'u1', dto as any);
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vatRate: 20 }),
        }),
      );
    });

    it('should set vatRate to 0 when company has no vatNumber and dto.vatRate is undefined', async () => {
      const dto = { sku: 'SKU002', name: 'Test', salePrice: 50 };
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue({ vatNumber: null, currencyId: null });
      mockPrisma.product.create.mockResolvedValue({ id: '1', ...dto, vatRate: 0 });

      await service.create('c1', 'u1', dto as any);
      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ vatRate: 0 }),
        }),
      );
    });

    it('should use explicit vatRate when provided in dto', async () => {
      const dto = { sku: 'SKU003', name: 'Test', salePrice: 50, vatRate: 9, purchaseCurrencyId: 'cur1', saleCurrencyId: 'cur1' };
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({ id: '1', ...dto });

      await service.create('c1', 'u1', dto as any);
      // company.findUnique should NOT be called since vatRate and currencies were provided
      expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    });

    it('should fallback purchaseCurrencyId and saleCurrencyId to company currency', async () => {
      const dto = { sku: 'SKU004', name: 'Test', salePrice: 100, vatRate: 20 };
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue({ vatNumber: 'BG123', currencyId: 'cur-bgn' });
      mockPrisma.product.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data }),
      );

      await service.create('c1', 'u1', dto as any);

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purchaseCurrencyId: 'cur-bgn',
            saleCurrencyId: 'cur-bgn',
          }),
        }),
      );
    });

    it('should NOT override explicit purchaseCurrencyId/saleCurrencyId', async () => {
      const dto = { sku: 'SKU005', name: 'Test', salePrice: 100, vatRate: 20, purchaseCurrencyId: 'cur-eur', saleCurrencyId: 'cur-usd' };
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data }),
      );

      await service.create('c1', 'u1', dto as any);

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purchaseCurrencyId: 'cur-eur',
            saleCurrencyId: 'cur-usd',
          }),
        }),
      );
      // Should not look up company since both currencies were provided
      expect(mockPrisma.company.findUnique).not.toHaveBeenCalled();
    });

    it('should handle company with no default currency', async () => {
      const dto = { sku: 'SKU006', name: 'Test', salePrice: 100, vatRate: 20 };
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue({ vatNumber: null, currencyId: null });
      mockPrisma.product.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data }),
      );

      await service.create('c1', 'u1', dto as any);

      // purchaseCurrencyId and saleCurrencyId should remain undefined (not set)
      const createCall = mockPrisma.product.create.mock.calls[0][0];
      expect(createCall.data.purchaseCurrencyId).toBeUndefined();
      expect(createCall.data.saleCurrencyId).toBeUndefined();
    });

    it('should fallback only missing currency (one provided, one not)', async () => {
      const dto = { sku: 'SKU007', name: 'Test', salePrice: 100, vatRate: 20, purchaseCurrencyId: 'cur-eur' };
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.company.findUnique.mockResolvedValue({ vatNumber: 'BG123', currencyId: 'cur-bgn' });
      mockPrisma.product.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: '1', ...data }),
      );

      await service.create('c1', 'u1', dto as any);

      expect(mockPrisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purchaseCurrencyId: 'cur-eur',   // kept explicit
            saleCurrencyId: 'cur-bgn',        // fallback to company
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should throw ConflictException when updating SKU to existing one', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce({ id: '1', companyId: 'c1' }) // findOne
        .mockResolvedValueOnce({ id: '2', sku: 'TAKEN' }); // SKU check

      await expect(
        service.update('c1', '1', { sku: 'TAKEN' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow keeping same SKU on update (no false conflict)', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce({ id: '1', companyId: 'c1', sku: 'MY-SKU' }) // findOne
        .mockResolvedValueOnce(null); // SKU check returns no conflict
      mockPrisma.product.update.mockResolvedValue({ id: '1', sku: 'MY-SKU' });

      const result = await service.update('c1', '1', { sku: 'MY-SKU' } as any);
      expect(result.sku).toBe('MY-SKU');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException for non-existent product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(service.findOne('c1', 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCategory', () => {
    it('should delete category when no products and no children', async () => {
      mockPrisma.productCategory.findFirst.mockResolvedValue({
        id: 'cat1',
        _count: { products: 0, children: 0 },
      });
      mockPrisma.productCategory.delete.mockResolvedValue({ id: 'cat1' });

      await service.removeCategory('c1', 'cat1');
      expect(mockPrisma.productCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat1' } });
    });

    it('should throw ConflictException when category has products', async () => {
      mockPrisma.productCategory.findFirst.mockResolvedValue({
        id: 'cat1',
        _count: { products: 5, children: 0 },
      });

      await expect(service.removeCategory('c1', 'cat1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when category has subcategories', async () => {
      mockPrisma.productCategory.findFirst.mockResolvedValue({
        id: 'cat1',
        _count: { products: 0, children: 2 },
      });

      await expect(service.removeCategory('c1', 'cat1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.productCategory.findFirst.mockResolvedValue(null);
      await expect(service.removeCategory('c1', 'bad')).rejects.toThrow(NotFoundException);
    });
  });
});
