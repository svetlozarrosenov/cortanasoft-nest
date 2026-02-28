import { Test, TestingModule } from '@nestjs/testing';
import { DocumentAIController } from './document-ai.controller';
import { DocumentAIService } from './document-ai.service';
import { PrismaService } from '../prisma/prisma.service';

const mockDocumentAIService = {
  isEnabled: jest.fn(),
  parseInvoice: jest.fn(),
  parseInvoiceFromBase64: jest.fn(),
};

const mockPrisma = {
  product: {
    findMany: jest.fn(),
  },
  supplier: {
    findMany: jest.fn(),
  },
};

describe('DocumentAIController', () => {
  let controller: DocumentAIController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentAIController],
      providers: [
        { provide: DocumentAIService, useValue: mockDocumentAIService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<DocumentAIController>(DocumentAIController);
  });

  describe('getStatus', () => {
    it('should return enabled status when service is configured', () => {
      mockDocumentAIService.isEnabled.mockReturnValue(true);

      const result = controller.getStatus();

      expect(result).toEqual({
        enabled: true,
        name: 'Cortana',
        capabilities: ['invoice_scan', 'text_extraction'],
      });
    });

    it('should return disabled status when service is not configured', () => {
      mockDocumentAIService.isEnabled.mockReturnValue(false);

      const result = controller.getStatus();

      expect(result).toEqual({
        enabled: false,
        name: 'Cortana',
        capabilities: ['invoice_scan', 'text_extraction'],
      });
    });
  });

  describe('scanInvoice', () => {
    const companyId = 'company-1';

    const mockParsedData = {
      invoiceNumber: 'INV-001',
      invoiceDate: '2024-06-15',
      supplierName: 'Тест Доставчик',
      supplierVatNumber: 'BG999888777',
      totalAmount: 600,
      vatAmount: 100,
      subtotal: 500,
      lineItems: [
        {
          description: 'Шоколадова торта голяма',
          quantity: 5,
          unitPrice: 60,
          totalPrice: 300,
          productCode: 'CHOC-LG',
        },
        {
          description: 'Ванилов крем',
          quantity: 10,
          unitPrice: 20,
          totalPrice: 200,
          productCode: undefined,
        },
      ],
      confidence: 0.92,
    };

    const mockProducts = [
      { id: 'p1', name: 'Шоколадова торта', sku: 'CHOC-LG' },
      { id: 'p2', name: 'Ванилов крем за торти', sku: 'VAN-CR' },
      { id: 'p3', name: 'Захар', sku: 'SUG-001' },
    ];

    it('should scan base64 image and return results with matched products', async () => {
      mockDocumentAIService.parseInvoiceFromBase64.mockResolvedValue(
        mockParsedData,
      );
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: 's1', name: 'Тест Доставчик ЕООД' },
      ]);

      const result = await controller.scanInvoice(companyId, {
        base64Image: 'base64data',
        mimeType: 'image/jpeg',
      });

      expect(result.invoiceNumber).toBe('INV-001');
      expect(result.lineItems).toHaveLength(2);

      // Should match product by SKU (exact match, confidence 1.0)
      const skuMatch = result.matchedProducts.find(
        (m) => m.sku === 'CHOC-LG',
      );
      expect(skuMatch).toBeDefined();
      expect(skuMatch!.confidence).toBe(1.0);
      expect(skuMatch!.productId).toBe('p1');

      // Should match product by fuzzy name
      const fuzzyMatch = result.matchedProducts.find(
        (m) => m.originalDescription === 'Ванилов крем',
      );
      expect(fuzzyMatch).toBeDefined();
      expect(fuzzyMatch!.productId).toBe('p2');

      // Should suggest supplier
      expect(result.suggestedSupplier).toBeDefined();
      expect(result.suggestedSupplier!.id).toBe('s1');
    });

    it('should scan image from URL', async () => {
      mockDocumentAIService.parseInvoice.mockResolvedValue(mockParsedData);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.supplier.findMany.mockResolvedValue([]);

      const result = await controller.scanInvoice(companyId, {
        imageUrl: 'https://example.com/invoice.jpg',
      });

      expect(mockDocumentAIService.parseInvoice).toHaveBeenCalledWith(
        'https://example.com/invoice.jpg',
      );
      expect(result.invoiceNumber).toBe('INV-001');
      expect(result.matchedProducts).toHaveLength(0);
      expect(result.suggestedSupplier).toBeUndefined();
    });

    it('should throw when neither imageUrl nor base64Image provided', async () => {
      await expect(controller.scanInvoice(companyId, {})).rejects.toThrow(
        'Either imageUrl or base64Image is required',
      );
    });

    it('should use default mime type when not provided', async () => {
      mockDocumentAIService.parseInvoiceFromBase64.mockResolvedValue({
        lineItems: [],
        confidence: 0.5,
      });
      mockPrisma.product.findMany.mockResolvedValue([]);

      await controller.scanInvoice(companyId, {
        base64Image: 'base64data',
      });

      expect(
        mockDocumentAIService.parseInvoiceFromBase64,
      ).toHaveBeenCalledWith('base64data', 'image/jpeg');
    });

    it('should match supplier by VAT number', async () => {
      mockDocumentAIService.parseInvoiceFromBase64.mockResolvedValue({
        supplierVatNumber: 'BG111222333',
        lineItems: [],
        confidence: 0.8,
      });
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: 's2', name: 'Supplier By VAT' },
      ]);

      const result = await controller.scanInvoice(companyId, {
        base64Image: 'data',
        mimeType: 'image/png',
      });

      expect(result.suggestedSupplier).toEqual({
        id: 's2',
        name: 'Supplier By VAT',
      });

      // Verify the Prisma query includes VAT number condition
      expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId,
            isActive: true,
            OR: expect.arrayContaining([
              expect.objectContaining({
                vatNumber: 'BG111222333',
              }),
            ]),
          }),
        }),
      );
    });

    it('should not match products below similarity threshold', async () => {
      mockDocumentAIService.parseInvoiceFromBase64.mockResolvedValue({
        lineItems: [
          {
            description: 'XY',
            quantity: 1,
            unitPrice: 10,
            totalPrice: 10,
          },
        ],
        confidence: 0.7,
      });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'Абсолютно различен продукт', sku: null },
      ]);
      mockPrisma.supplier.findMany.mockResolvedValue([]);

      const result = await controller.scanInvoice(companyId, {
        base64Image: 'data',
      });

      expect(result.matchedProducts).toHaveLength(0);
    });

    it('should handle scan with no supplier info', async () => {
      mockDocumentAIService.parseInvoiceFromBase64.mockResolvedValue({
        invoiceNumber: 'INV-002',
        lineItems: [],
        confidence: 0.9,
      });
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await controller.scanInvoice(companyId, {
        base64Image: 'data',
      });

      expect(result.suggestedSupplier).toBeUndefined();
      // Should not even query suppliers when no supplier info
      expect(mockPrisma.supplier.findMany).not.toHaveBeenCalled();
    });

    it('should query only active products for matching', async () => {
      mockDocumentAIService.parseInvoiceFromBase64.mockResolvedValue({
        lineItems: [
          {
            description: 'Test',
            quantity: 1,
            unitPrice: 10,
            totalPrice: 10,
          },
        ],
        confidence: 0.8,
      });
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.supplier.findMany.mockResolvedValue([]);

      await controller.scanInvoice(companyId, { base64Image: 'data' });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
        select: { id: true, name: true, sku: true },
      });
    });
  });
});
