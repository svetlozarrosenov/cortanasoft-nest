import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProformasService } from './proformas.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma: any = {
  proforma: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
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
  },
  customer: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
};

describe('ProformasService', () => {
  let service: ProformasService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProformasService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ProformasService>(ProformasService);
  });

  describe('create', () => {
    const companyWithVat = { vatNumber: 'BG123456789', currencyId: 'curr-bgn' };
    const companyWithoutVat = { vatNumber: null, currencyId: 'curr-bgn' };

    const baseDto = {
      customerName: 'Test Client',
      items: [
        {
          description: 'Service A',
          quantity: 2,
          unitPrice: 100,
        },
      ],
    };

    const makeDtoWithProduct = (overrides = {}) => ({
      customerName: 'Test Client',
      items: [
        {
          productId: 'p1',
          description: 'Product A',
          quantity: 5,
          unitPrice: 50,
        },
      ],
      ...overrides,
    });

    it('should create proforma with a plain 10-digit number (no prefix)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null); // no existing proforma
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const result = await service.create('c1', 'u1', baseDto as any);

      expect(result.proformaNumber).toBe('0000000001');
    });

    it('starts from the company proforma start number when there are no proformas yet', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        ...companyWithVat,
        proformaDefaultStartNumber: 250,
      });
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const result = await service.create('c1', 'u1', baseDto as any);

      expect(result.proformaNumber).toBe('0000000250');
    });

    it('ignores the start number once a proforma exists', async () => {
      mockPrisma.company.findUnique.mockResolvedValue({
        ...companyWithVat,
        proformaDefaultStartNumber: 250,
      });
      mockPrisma.proforma.findFirst.mockResolvedValue({
        proformaNumber: '0000000003',
      });
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const result = await service.create('c1', 'u1', baseDto as any);

      expect(result.proformaNumber).toBe('0000000004');
    });

    it('should increment proforma number when previous exists', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue({
        proformaNumber: '0000000003',
      });
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const result = await service.create('c1', 'u1', baseDto as any);

      expect(result.proformaNumber).toBe('0000000004');
    });

    it('should calculate totals correctly (subtotal, VAT, total)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          { description: 'Item A', quantity: 10, unitPrice: 100 }, // subtotal 1000
          { description: 'Item B', quantity: 5, unitPrice: 200 }, // subtotal 1000
        ],
      };

      const result = await service.create('c1', 'u1', dto as any);

      // Company has VAT number, so defaultVatRate = 20
      // Total subtotal = 2000, Total VAT = 400, Total = 2400
      expect(result.subtotal).toBe(2000);
      expect(result.vatAmount).toBe(400);
      expect(result.total).toBe(2400);
    });

    it('should handle empty items array gracefully', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [],
      };

      const result = await service.create('c1', 'u1', dto as any);

      expect(result.subtotal).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.total).toBe(0);
      expect(mockPrisma.proforma.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: { create: [] },
          }),
        }),
      );
    });

    it('should throw NotFoundException when company not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);

      await expect(service.create('c1', 'u1', baseDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when a productId does not exist in the company', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.product.findMany.mockResolvedValue([]); // no products found

      const dto = makeDtoWithProduct();

      await expect(service.create('c1', 'u1', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use company default VAT rate (20) when item vatRate not provided and company has vatNumber', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [{ description: 'Service', quantity: 1, unitPrice: 100 }],
      };

      const result = await service.create('c1', 'u1', dto as any);

      expect(result.vatAmount).toBe(20);
      expect(result.total).toBe(120);
    });

    it('should use 0% VAT rate when company has no vatNumber and item vatRate not provided', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithoutVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [{ description: 'Service', quantity: 1, unitPrice: 100 }],
      };

      const result = await service.create('c1', 'u1', dto as any);

      expect(result.vatAmount).toBe(0);
      expect(result.total).toBe(100);
    });

    it('should allow items without productId (free-text items)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [{ description: 'Custom service', quantity: 3, unitPrice: 50 }],
      };

      await service.create('c1', 'u1', dto as any);

      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.proforma.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: [
                expect.objectContaining({
                  productId: null,
                  description: 'Custom service',
                  quantity: 3,
                  unitPrice: 50,
                }),
              ],
            },
          }),
        }),
      );
    });

    it('should set status to DRAFT', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const result = await service.create('c1', 'u1', baseDto as any);

      expect(result.status).toBe('DRAFT');
    });

    it('should use company currencyId as default when not provided in DTO', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      await service.create('c1', 'u1', baseDto as any);

      expect(mockPrisma.proforma.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currencyId: 'curr-bgn' }),
        }),
      );
    });

    it('should use product vatRate when item has productId and no explicit vatRate', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'p1', vatRate: 9 }]);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          {
            productId: 'p1',
            description: 'Product A',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      const result = await service.create('c1', 'u1', dto as any);

      expect(result.vatAmount).toBe(9);
    });

    it('should apply item discount when calculating subtotal', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          {
            description: 'Service',
            quantity: 10,
            unitPrice: 100,
            discount: 50,
          },
        ],
      };

      const result = await service.create('c1', 'u1', dto as any);

      // itemSubtotal = 10*100 - 50 = 950, vat = 950 * 0.20 = 190, total = 1140
      expect(result.subtotal).toBe(950);
      expect(result.vatAmount).toBe(190);
      expect(result.total).toBe(1140);
    });

    it('should apply document-level discount against the taxable base (VAT recomputed)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        discount: 100,
        items: [{ description: 'Service', quantity: 10, unitPrice: 100 }],
      };

      const result = await service.create('c1', 'u1', dto as any);

      // discountedBase = 1000 - 100 = 900
      // vat = 200 * (900 / 1000) = 180
      // total = 900 + 180 = 1080
      expect(result.subtotal).toBe(1000);
      expect(result.vatAmount).toBe(180);
      expect(result.discount).toBe(100);
      expect(result.total).toBe(1080);
    });

    it('should set companyId and createdById correctly', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.proforma.findFirst.mockResolvedValue(null);
      mockPrisma.proforma.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'pf1', ...data }),
      );

      await service.create('c1', 'u1', baseDto as any);

      expect(mockPrisma.proforma.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'c1',
            createdById: 'u1',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const existing = (overrides = {}) => ({
      id: 'pf1',
      companyId: 'c1',
      status: 'ISSUED',
      discount: 0,
      items: [
        {
          productId: null,
          description: 'Service A',
          quantity: 2,
          unitPrice: 100,
          vatRate: 20,
          discount: 0,
        },
      ],
      ...overrides,
    });

    beforeEach(() => {
      mockPrisma.company.findUnique.mockResolvedValue({
        vatNumber: 'BG123456789',
      });
      mockPrisma.proforma.update.mockResolvedValue({});
    });

    it('replaces the lines and recalculates the totals of an issued proforma', async () => {
      mockPrisma.proforma.findFirst.mockResolvedValue(existing());

      await service.update('c1', 'pf1', {
        customerName: 'New Client',
        customerId: null as any,
        invoiceDate: '2026-10-05',
        discount: 50,
        items: [
          { description: 'Service B', quantity: 3, unitPrice: 100, vatRate: 20 },
        ],
      });

      const { where, data } = mockPrisma.proforma.update.mock.calls[0][0];
      expect(where).toEqual({ id: 'pf1' });
      expect(data.customerName).toBe('New Client');
      expect(data.customerId).toBeNull();
      expect(data.proformaDate).toEqual(new Date('2026-10-05'));
      expect(data.subtotal).toBe(300);
      expect(data.discount).toBe(50);
      expect(data.vatAmount).toBe(50);
      expect(data.total).toBe(300);
      expect(data.items.deleteMany).toEqual({});
      expect(data.items.create).toHaveLength(1);
      expect(data.items.create[0].description).toBe('Service B');
      // Номерът и статусът не се пипат при редакция на съдържанието
      expect(data).not.toHaveProperty('proformaNumber');
      expect(data).not.toHaveProperty('status');
    });

    it('recalculates from the stored lines when only the document discount changes', async () => {
      mockPrisma.proforma.findFirst.mockResolvedValue(existing());

      await service.update('c1', 'pf1', { discount: 100 });

      const { data } = mockPrisma.proforma.update.mock.calls[0][0];
      expect(data.subtotal).toBe(200);
      expect(data.vatAmount).toBe(20);
      expect(data.total).toBe(120);
      expect(data).not.toHaveProperty('items');
    });

    it('changes only the status without touching the totals', async () => {
      mockPrisma.proforma.findFirst.mockResolvedValue(existing());

      await service.update('c1', 'pf1', { status: 'PAID' });

      const { data } = mockPrisma.proforma.update.mock.calls[0][0];
      expect(data).toEqual({ status: 'PAID' });
    });

    it('rejects editing a cancelled proforma', async () => {
      mockPrisma.proforma.findFirst.mockResolvedValue(
        existing({ status: 'CANCELLED' }),
      );

      await expect(
        service.update('c1', 'pf1', { notes: 'changed' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.proforma.update).not.toHaveBeenCalled();
    });

    it('rejects a customer from another company', async () => {
      mockPrisma.proforma.findFirst.mockResolvedValue(existing());
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.update('c1', 'pf1', { customerId: 'foreign' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.proforma.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw when proforma is not DRAFT', async () => {
      mockPrisma.proforma.findFirst.mockResolvedValue({
        id: 'pf1',
        companyId: 'c1',
        status: 'ISSUED',
      });

      await expect(service.remove('c1', 'pf1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete a DRAFT proforma', async () => {
      mockPrisma.proforma.findFirst.mockResolvedValue({
        id: 'pf1',
        companyId: 'c1',
        status: 'DRAFT',
      });
      mockPrisma.proforma.delete.mockResolvedValue({});

      const result = await service.remove('c1', 'pf1');

      expect(mockPrisma.proforma.delete).toHaveBeenCalledWith({
        where: { id: 'pf1' },
      });
      expect(result).toHaveProperty('message');
    });
  });
});
