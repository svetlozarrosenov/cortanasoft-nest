import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

const mockPayments = {
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  syncPaymentsFromStatus: jest.fn(),
  recalculateOrderState: jest.fn(),
};

const mockPrisma: any = {
  invoice: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
  invoiceAdvanceDeduction: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
};

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPayments },
      ],
    }).compile();
    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('createFromOrder', () => {
    const makeOrder = (status: string) => ({
      id: 'ord1',
      companyId: 'c1',
      status,
      customerName: 'Client',
      customerId: 'cust1',
      shippingAddress: 'Addr',
      shippingCity: 'City',
      shippingPostalCode: '1000',
      subtotal: 1000,
      vatAmount: 200,
      discount: 0,
      total: 1200,
      paymentMethod: 'CASH',
      customer: { eik: '123', vatNumber: 'BG123', address: null, city: null, postalCode: null },
      items: [
        { id: 'oi1', productId: 'p1', quantity: 10, unitPrice: 100, vatRate: 20, discount: 0, subtotal: 1000, product: { name: 'Product' } },
      ],
    });

    it('should create invoice from CONFIRMED order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('CONFIRMED'));
      mockPrisma.invoice.findFirst.mockResolvedValue(null); // for generateInvoiceNumber
      mockPrisma.invoice.create.mockResolvedValue({ id: 'inv1', status: 'DRAFT' });

      const result = await service.createFromOrder('c1', 'u1', { orderId: 'ord1' } as any);
      expect(result.status).toBe('DRAFT');
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);
      await expect(
        service.createFromOrder('c1', 'u1', { orderId: 'bad' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for PENDING order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('PENDING'));
      await expect(
        service.createFromOrder('c1', 'u1', { orderId: 'ord1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for DRAFT order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('DRAFT'));
      await expect(
        service.createFromOrder('c1', 'u1', { orderId: 'ord1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow creating from PROCESSING order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('PROCESSING'));
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({ id: 'inv1' });

      await expect(service.createFromOrder('c1', 'u1', { orderId: 'ord1' } as any)).resolves.toBeDefined();
    });

    it('should allow creating from SHIPPED order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('SHIPPED'));
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({ id: 'inv1' });

      await expect(service.createFromOrder('c1', 'u1', { orderId: 'ord1' } as any)).resolves.toBeDefined();
    });

    it('should allow creating from DELIVERED order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('DELIVERED'));
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockResolvedValue({ id: 'inv1' });

      await expect(service.createFromOrder('c1', 'u1', { orderId: 'ord1' } as any)).resolves.toBeDefined();
    });

    it('should generate invoice number with correct format', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(makeOrder('CONFIRMED'));
      mockPrisma.invoice.findFirst.mockResolvedValue({ invoiceNumber: `INV-${new Date().getFullYear()}-00007` });
      mockPrisma.invoice.create.mockImplementation(({ data }) => Promise.resolve({ id: 'inv1', ...data }));

      const result = await service.createFromOrder('c1', 'u1', { orderId: 'ord1' } as any);
      expect(result.invoiceNumber).toBe(`INV-${new Date().getFullYear()}-00008`);
    });
  });

  describe('issue', () => {
    it('should issue a DRAFT invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'DRAFT' });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv1', status: 'ISSUED' });

      const result = await service.issue('c1', 'inv1');
      expect(result.status).toBe('ISSUED');
    });

    it('should throw BadRequestException when issuing non-DRAFT', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'ISSUED' });
      await expect(service.issue('c1', 'inv1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordPayment', () => {
    it('should record full payment and set status to PAID', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv1', status: 'ISSUED', paidAmount: 0, total: 1000, paymentMethod: 'CASH',
      });
      mockPrisma.invoice.update.mockImplementation(({ data }) => Promise.resolve({ id: 'inv1', ...data }));

      const result = await service.recordPayment('c1', 'inv1', { amount: 1000 } as any);
      expect(result.status).toBe('PAID');
      expect(result.paidAmount).toBe(1000);
    });

    it('should record partial payment and set status to PARTIALLY_PAID', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv1', status: 'ISSUED', paidAmount: 0, total: 1000, paymentMethod: 'CASH',
      });
      mockPrisma.invoice.update.mockImplementation(({ data }) => Promise.resolve({ id: 'inv1', ...data }));

      const result = await service.recordPayment('c1', 'inv1', { amount: 500 } as any);
      expect(result.status).toBe('PARTIALLY_PAID');
      expect(result.paidAmount).toBe(500);
    });

    it('should cap paidAmount at total (overpay protection)', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv1', status: 'ISSUED', paidAmount: 900, total: 1000, paymentMethod: 'CASH',
      });
      mockPrisma.invoice.update.mockImplementation(({ data }) => Promise.resolve({ id: 'inv1', ...data }));

      const result = await service.recordPayment('c1', 'inv1', { amount: 500 } as any);
      // 900 + 500 = 1400, but capped at 1000
      expect(result.paidAmount).toBe(1000);
      expect(result.status).toBe('PAID');
    });

    it('should throw BadRequestException when paying DRAFT invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'DRAFT' });
      await expect(service.recordPayment('c1', 'inv1', { amount: 100 } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when paying CANCELLED invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'CANCELLED' });
      await expect(service.recordPayment('c1', 'inv1', { amount: 100 } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when paying already PAID invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'PAID' });
      await expect(service.recordPayment('c1', 'inv1', { amount: 100 } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel DRAFT invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'DRAFT' });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv1', status: 'CANCELLED' });

      const result = await service.cancel('c1', 'inv1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should cancel ISSUED invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'ISSUED' });
      mockPrisma.invoice.update.mockResolvedValue({ id: 'inv1', status: 'CANCELLED' });

      const result = await service.cancel('c1', 'inv1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw BadRequestException when cancelling PAID invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'PAID' });
      await expect(service.cancel('c1', 'inv1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cancelling PARTIALLY_PAID invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'PARTIALLY_PAID' });
      await expect(service.cancel('c1', 'inv1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when cancelling already CANCELLED invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'CANCELLED' });
      await expect(service.cancel('c1', 'inv1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove DRAFT invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'DRAFT' });
      mockPrisma.invoice.delete.mockResolvedValue({});

      const result = await service.remove('c1', 'inv1');
      expect(mockPrisma.invoice.delete).toHaveBeenCalledWith({ where: { id: 'inv1' } });
    });

    it('should throw BadRequestException when removing non-DRAFT invoice', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'inv1', status: 'ISSUED' });
      await expect(service.remove('c1', 'inv1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createProforma', () => {
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

    it('should create proforma with correct PRO- prefix number', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null); // no existing proforma
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const result = await service.createProforma('c1', 'u1', baseDto as any);

      const year = new Date().getFullYear();
      expect(result.invoiceNumber).toBe(`PRO-${year}-00001`);
    });

    it('should increment proforma number when previous exists', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue({
        invoiceNumber: `PRO-${new Date().getFullYear()}-00003`,
      });
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const result = await service.createProforma('c1', 'u1', baseDto as any);

      const year = new Date().getFullYear();
      expect(result.invoiceNumber).toBe(`PRO-${year}-00004`);
    });

    it('should calculate totals correctly (subtotal, VAT, total)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          { description: 'Item A', quantity: 10, unitPrice: 100 }, // subtotal 1000
          { description: 'Item B', quantity: 5, unitPrice: 200 },  // subtotal 1000
        ],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // Company has VAT number, so defaultVatRate = 20
      // Item A: subtotal = 10*100 = 1000, vat = 1000 * 0.20 = 200
      // Item B: subtotal = 5*200 = 1000, vat = 1000 * 0.20 = 200
      // Total subtotal = 2000, Total VAT = 400, Total = 2400
      expect(result.subtotal).toBe(2000);
      expect(result.vatAmount).toBe(400);
      expect(result.total).toBe(2400);
    });

    it('should handle empty items array gracefully', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // With no items: subtotal = 0, vatAmount = 0, total = 0
      expect(result.subtotal).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.total).toBe(0);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: { create: [] },
          }),
        }),
      );
    });

    it('should throw NotFoundException when company not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);

      await expect(
        service.createProforma('c1', 'u1', baseDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when a productId does not exist in the company', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.product.findMany.mockResolvedValue([]); // no products found

      const dto = makeDtoWithProduct();

      await expect(
        service.createProforma('c1', 'u1', dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when some productIds are missing', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', vatRate: 20 },
      ]);

      const dto = {
        customerName: 'Client',
        items: [
          { productId: 'p1', description: 'Product A', quantity: 1, unitPrice: 10 },
          { productId: 'p-missing', description: 'Product B', quantity: 1, unitPrice: 20 },
        ],
      };

      await expect(
        service.createProforma('c1', 'u1', dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use company default VAT rate (20) when item vatRate not provided and company has vatNumber', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          { description: 'Service', quantity: 1, unitPrice: 100 }, // no vatRate specified
        ],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // defaultVatRate = 20 (company has vatNumber)
      // subtotal = 100, vat = 100 * 0.20 = 20, total = 120
      expect(result.vatAmount).toBe(20);
      expect(result.total).toBe(120);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: [
                expect.objectContaining({ vatRate: 20 }),
              ],
            },
          }),
        }),
      );
    });

    it('should use 0% VAT rate when company has no vatNumber and item vatRate not provided', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithoutVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          { description: 'Service', quantity: 1, unitPrice: 100 },
        ],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // defaultVatRate = 0 (no vatNumber)
      // subtotal = 100, vat = 0, total = 100
      expect(result.vatAmount).toBe(0);
      expect(result.total).toBe(100);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: [
                expect.objectContaining({ vatRate: 0 }),
              ],
            },
          }),
        }),
      );
    });

    it('should allow items without productId (free-text items)', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          { description: 'Custom service', quantity: 3, unitPrice: 50 },
        ],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // Should not call product.findMany since no productIds
      expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
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

    it('should set type to PROFORMA and status to DRAFT', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const result = await service.createProforma('c1', 'u1', baseDto as any);

      expect(result.type).toBe('PROFORMA');
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PROFORMA',
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('should use company currencyId as default when not provided in DTO', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      // DTO without currencyId
      const result = await service.createProforma('c1', 'u1', baseDto as any);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyId: 'curr-bgn',
          }),
        }),
      );
    });

    it('should use DTO currencyId when provided', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        ...baseDto,
        currencyId: 'curr-eur',
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currencyId: 'curr-eur',
          }),
        }),
      );
    });

    it('should use product vatRate when item has productId and no explicit vatRate', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', vatRate: 9 },
      ]);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          { productId: 'p1', description: 'Product A', quantity: 1, unitPrice: 100 },
        ],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // Product vatRate = 9, so itemVat = 100 * 0.09 = 9
      expect(result.vatAmount).toBe(9);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: [
                expect.objectContaining({ vatRate: 9 }),
              ],
            },
          }),
        }),
      );
    });

    it('should prefer explicit item vatRate over product vatRate', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', vatRate: 9 },
      ]);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          { productId: 'p1', description: 'Product A', quantity: 1, unitPrice: 100, vatRate: 5 },
        ],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // Explicit vatRate = 5 overrides product vatRate = 9
      expect(result.vatAmount).toBe(5);
      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: [
                expect.objectContaining({ vatRate: 5 }),
              ],
            },
          }),
        }),
      );
    });

    it('should apply item discount when calculating subtotal', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        items: [
          { description: 'Service', quantity: 10, unitPrice: 100, discount: 50 },
        ],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // itemSubtotal = 10*100 - 50 = 950, vat = 950 * 0.20 = 190
      // total = 950 + 190 = 1140
      expect(result.subtotal).toBe(950);
      expect(result.vatAmount).toBe(190);
      expect(result.total).toBe(1140);
    });

    it('should apply invoice-level discount to total', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      const dto = {
        customerName: 'Client',
        discount: 100,
        items: [
          { description: 'Service', quantity: 10, unitPrice: 100 },
        ],
      };

      const result = await service.createProforma('c1', 'u1', dto as any);

      // subtotal = 1000, vat = 200, total = 1000 + 200 - 100 = 1100
      expect(result.subtotal).toBe(1000);
      expect(result.vatAmount).toBe(200);
      expect(result.discount).toBe(100);
      expect(result.total).toBe(1100);
    });

    it('should set companyId and createdById correctly', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(companyWithVat);
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.invoice.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'inv1', ...data }),
      );

      await service.createProforma('c1', 'u1', baseDto as any);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'c1',
            createdById: 'u1',
          }),
        }),
      );
    });
  });

  describe('createAdvance', () => {
    const baseOrder = {
      id: 'ord1',
      orderNumber: 'ORD-1',
      companyId: 'c1',
      status: 'CONFIRMED',
      customerName: 'Client',
      customerId: 'cust1',
      shippingAddress: 'Addr',
      shippingCity: 'City',
      shippingPostalCode: '1000',
      subtotal: 1000,
      vatAmount: 200,
      discount: 0,
      total: 1200,
      advancedAmount: 0,
      paymentMethod: 'BANK_TRANSFER',
      customer: { eik: '123', vatNumber: 'BG123', address: null, city: null, postalCode: null },
    };

    it('should create ADVANCE invoice with AVN- prefix and update order.advancedAmount', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      mockPrisma.invoice.count
        .mockResolvedValueOnce(0) // conflicting REGULAR/FINAL guard
        .mockResolvedValueOnce(0); // numbering count for AVN
      mockPrisma.invoice.create.mockResolvedValue({ id: 'avn1', type: 'ADVANCE' });
      mockPrisma.order.update.mockResolvedValue({});

      await service.createAdvance('c1', 'u1', { orderId: 'ord1', amount: 360 } as any);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: expect.stringMatching(/^AVN-/),
            type: 'ADVANCE',
            status: 'ISSUED',
            total: 360,
            // 360/1200 = 0.30 → subtotal 300, vat 60
            subtotal: 300,
            vatAmount: 60,
          }),
        }),
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord1' },
        data: { advancedAmount: 360 },
      });
    });

    it('should reject ADVANCE > order remainder', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder, advancedAmount: 1000 });
      mockPrisma.invoice.count.mockResolvedValue(0);

      await expect(
        service.createAdvance('c1', 'u1', { orderId: 'ord1', amount: 500 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ADVANCE if REGULAR/FINAL already exist on order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      mockPrisma.invoice.count.mockResolvedValueOnce(1); // conflict found

      await expect(
        service.createAdvance('c1', 'u1', { orderId: 'ord1', amount: 100 } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ADVANCE on non-confirmed order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue({ ...baseOrder, status: 'PENDING' });
      await expect(
        service.createAdvance('c1', 'u1', { orderId: 'ord1', amount: 100 } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createFinal', () => {
    const baseOrder = {
      id: 'ord1',
      orderNumber: 'ORD-1',
      companyId: 'c1',
      status: 'CONFIRMED',
      customerName: 'Client',
      customerId: 'cust1',
      shippingAddress: 'Addr',
      shippingCity: 'City',
      shippingPostalCode: '1000',
      subtotal: 1000,
      vatAmount: 200,
      discount: 0,
      total: 1200,
      invoicedAmount: 0,
      paymentMethod: 'BANK_TRANSFER',
      customer: { eik: '123', vatNumber: 'BG123', address: null, city: null, postalCode: null },
      items: [
        { id: 'oi1', productId: 'p1', quantity: 10, unitPrice: 100, vatRate: 20, discount: 0, subtotal: 1000, product: { name: 'Product' } },
      ],
    };

    const advance = (over: any = {}) => ({
      id: 'avn1',
      type: 'ADVANCE',
      orderId: 'ord1',
      status: 'PAID',
      invoiceNumber: 'AVN-0000000001',
      subtotal: 250,
      vatAmount: 50,
      total: 300,
      paidAmount: 300,
      deductedInFinals: [],
      ...over,
    });

    it('should create FINAL with one ADVANCE deducted, status=PAID when advances cover', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      mockPrisma.invoice.findMany.mockResolvedValue([advance({ subtotal: 1000, vatAmount: 200, total: 1200 })]);
      mockPrisma.invoice.count.mockResolvedValue(0); // numbering
      mockPrisma.invoice.create.mockResolvedValue({ id: 'final1', type: 'FINAL' });
      mockPrisma.order.update.mockResolvedValue({});

      await service.createFinal('c1', 'u1', {
        orderId: 'ord1',
        advanceInvoiceIds: ['avn1'],
      } as any);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'FINAL',
            status: 'PAID',
            total: 0, // fully covered
            advanceDeductions: { create: [expect.objectContaining({ advanceInvoiceId: 'avn1', total: 1200 })] },
          }),
        }),
      );
    });

    it('should compute remainder correctly with partial advance', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      mockPrisma.invoice.findMany.mockResolvedValue([advance()]); // 300 advance on 1200 order → 900 remainder
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.create.mockResolvedValue({ id: 'final1' });
      mockPrisma.order.update.mockResolvedValue({});

      await service.createFinal('c1', 'u1', {
        orderId: 'ord1',
        advanceInvoiceIds: ['avn1'],
      } as any);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'FINAL',
            total: 900,
            subtotal: 750,
            vatAmount: 150,
          }),
        }),
      );
    });

    it('should reject when advance is on different order', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      mockPrisma.invoice.findMany.mockResolvedValue([advance({ orderId: 'other-order' })]);

      await expect(
        service.createFinal('c1', 'u1', { orderId: 'ord1', advanceInvoiceIds: ['avn1'] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when advance already deducted in another final', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      mockPrisma.invoice.findMany.mockResolvedValue([advance({ deductedInFinals: [{ id: 'd1' }] })]);

      await expect(
        service.createFinal('c1', 'u1', { orderId: 'ord1', advanceInvoiceIds: ['avn1'] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when picked invoice is not an advance', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      mockPrisma.invoice.findMany.mockResolvedValue([advance({ type: 'REGULAR' })]);

      await expect(
        service.createFinal('c1', 'u1', { orderId: 'ord1', advanceInvoiceIds: ['avn1'] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty advanceInvoiceIds', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);

      await expect(
        service.createFinal('c1', 'u1', { orderId: 'ord1', advanceInvoiceIds: [] } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when sum of advances exceeds order total', async () => {
      mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      mockPrisma.invoice.findMany.mockResolvedValue([
        advance({ subtotal: 1500, vatAmount: 300, total: 1800 }),
      ]);

      await expect(
        service.createFinal('c1', 'u1', { orderId: 'ord1', advanceInvoiceIds: ['avn1'] } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel — advance/final guards', () => {
    it('should block cancelling an ADVANCE that is deducted in active FINAL', async () => {
      const advance = {
        id: 'avn1',
        companyId: 'c1',
        type: 'ADVANCE',
        status: 'ISSUED',
        total: 300,
        orderId: 'ord1',
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(advance);
      mockPrisma.invoiceAdvanceDeduction.findMany.mockResolvedValue([
        { id: 'd1', finalInvoice: { id: 'fin1', status: 'ISSUED' } },
      ]);

      await expect(service.cancel('c1', 'avn1')).rejects.toThrow(BadRequestException);
    });

    it('should allow cancelling ADVANCE if its FINAL is already cancelled', async () => {
      const advance = {
        id: 'avn1',
        companyId: 'c1',
        type: 'ADVANCE',
        status: 'ISSUED',
        total: 300,
        orderId: 'ord1',
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(advance);
      mockPrisma.invoiceAdvanceDeduction.findMany.mockResolvedValue([
        { id: 'd1', finalInvoice: { id: 'fin1', status: 'CANCELLED' } },
      ]);
      mockPrisma.invoice.update.mockResolvedValue({ ...advance, status: 'CANCELLED' });
      mockPrisma.order.update.mockResolvedValue({});

      await expect(service.cancel('c1', 'avn1')).resolves.toBeDefined();
      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord1' },
        data: { advancedAmount: { decrement: 300 } },
      });
    });
  });
});
