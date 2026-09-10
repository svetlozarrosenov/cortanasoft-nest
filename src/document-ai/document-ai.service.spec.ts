import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DocumentAIService } from './document-ai.service';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock the Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

const mockAiSettings = {
  getApiKeyForCompany: jest.fn(),
  getAiConfigForCompany: jest.fn(),
};

const mockPrisma = {
  product: { findMany: jest.fn() },
  supplier: { findMany: jest.fn() },
  order: { findMany: jest.fn() },
  invoice: { findMany: jest.fn() },
  expense: { findMany: jest.fn() },
};

/** Отговорът идва през submit_invoice tool-а, а не като текст */
const submitInvoice = (input: Record<string, unknown>) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', name: 'submit_invoice', input }],
});

describe('DocumentAIService', () => {
  let service: DocumentAIService;

  describe('when API key is configured', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      mockAiSettings.getApiKeyForCompany.mockResolvedValue('test-api-key');
      mockAiSettings.getAiConfigForCompany.mockResolvedValue({
        apiKey: 'test-api-key',
        model: 'claude-haiku-4-5',
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentAIService,
          { provide: AiSettingsService, useValue: mockAiSettings },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      service = module.get<DocumentAIService>(DocumentAIService);
    });

    it('should be enabled', async () => {
      await expect(service.isEnabledForCompany('c1')).resolves.toBe(true);
    });

    describe('parseInvoiceFromBase64', () => {
      it('should parse a valid invoice response', async () => {
        const claudeResponse = {
          invoiceNumber: 'INV-2024-001',
          invoiceDate: '2024-06-15',
          supplierName: 'Доставчик ЕООД',
          supplierVatNumber: 'BG123456789',
          supplierAddress: 'ул. Тестова 1, София',
          totalAmount: 1200.0,
          vatAmount: 200.0,
          subtotal: 1000.0,
          lineItems: [
            {
              description: 'Шоколадова торта',
              quantity: 10,
              unitPrice: 50.0,
              totalPrice: 500.0,
              productCode: 'CHOC-001',
            },
            {
              description: 'Ванилов сладолед',
              quantity: 20,
              unitPrice: 25.0,
              totalPrice: 500.0,
              productCode: null,
            },
          ],
          confidence: 0.95,
        };

        mockCreate.mockResolvedValue(submitInvoice(claudeResponse));

        const result = await service.parseInvoiceFromBase64('c1', 
          'base64imagedata',
          'image/jpeg',
        );

        expect(result.invoiceNumber).toBe('INV-2024-001');
        expect(result.invoiceDate).toBe('2024-06-15');
        expect(result.supplierName).toBe('Доставчик ЕООД');
        expect(result.supplierVatNumber).toBe('BG123456789');
        expect(result.totalAmount).toBe(1200.0);
        expect(result.vatAmount).toBe(200.0);
        expect(result.subtotal).toBe(1000.0);
        expect(result.lineItems).toHaveLength(2);
        expect(result.lineItems[0]).toEqual({
          description: 'Шоколадова торта',
          quantity: 10,
          unitPrice: 50.0,
          totalPrice: 500.0,
          productCode: 'CHOC-001',
        });
        expect(result.lineItems[1].productCode).toBeUndefined();
        expect(result.confidence).toBe(0.95);
      });

      it('should strip data:image prefix from base64', async () => {
        mockCreate.mockResolvedValue(
          submitInvoice({ lineItems: [], confidence: 0.8 }),
        );

        await service.parseInvoiceFromBase64('c1', 
          'data:image/jpeg;base64,actualbase64data',
          'image/jpeg',
        );

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({
                content: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'image',
                    source: expect.objectContaining({
                      data: 'actualbase64data',
                    }),
                  }),
                ]),
              }),
            ]),
          }),
        );
      });

      it('should extract the supplier details for a new supplier', async () => {
        mockCreate.mockResolvedValue(
          submitInvoice({
            supplierName: 'Хетих България ООД',
            supplierEik: 'ЕИК 200224567',
            supplierVatNumber: 'BG200224567',
            supplierAddress: 'ул. Тестова 1',
            supplierCity: 'София',
            supplierIban: 'BG80BNBG96611020345678',
            supplierBic: 'BNBGBGSF',
            supplierBankName: 'ДСК',
            supplierPhone: '0888123456',
            supplierEmail: 'office@example.bg',
            lineItems: [],
            confidence: 0.9,
          }),
        );

        const result = await service.parseInvoiceFromBase64(
          'c1',
          'base64data',
          'image/png',
        );

        // ЕИК се прибира само с цифрите — така се сравнява с базата
        expect(result.supplierEik).toBe('200224567');
        expect(result.supplierCity).toBe('София');
        expect(result.supplierIban).toBe('BG80BNBG96611020345678');
        expect(result.supplierBic).toBe('BNBGBGSF');
        expect(result.supplierBankName).toBe('ДСК');
        expect(result.supplierPhone).toBe('0888123456');
        expect(result.supplierEmail).toBe('office@example.bg');
      });

      it('should parse Bulgarian date format DD.MM.YYYY', async () => {
        mockCreate.mockResolvedValue(
          submitInvoice({
            invoiceDate: '15.06.2024',
            lineItems: [],
            confidence: 0.85,
          }),
        );

        const result = await service.parseInvoiceFromBase64('c1', 
          'base64data',
          'image/jpeg',
        );

        expect(result.invoiceDate).toBe('2024-06-15');
      });

      it('should handle missing line item fields gracefully', async () => {
        mockCreate.mockResolvedValue(
          submitInvoice({
            lineItems: [
              { description: 'Some item' },
              { quantity: 5, unitPrice: 10 },
            ],
            confidence: 0.7,
          }),
        );

        const result = await service.parseInvoiceFromBase64('c1', 
          'base64data',
          'image/jpeg',
        );

        expect(result.lineItems).toHaveLength(2);
        expect(result.lineItems[0]).toEqual({
          description: 'Some item',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          productCode: undefined,
        });
        expect(result.lineItems[1]).toEqual({
          description: '',
          quantity: 5,
          unitPrice: 10,
          totalPrice: 0,
          productCode: undefined,
        });
      });

      // Преди отговор без резултат минаваше за успех с празни данни и
      // формата просто не се променяше — изглеждаше като „не сработи"
      it('should fail loudly when Claude answers without the tool', async () => {
        mockCreate.mockResolvedValue({
          stop_reason: 'end_turn',
          content: [
            { type: 'text', text: 'Sorry, I cannot process this image.' },
          ],
        });

        await expect(
          service.parseInvoiceFromBase64('c1', 'base64data', 'image/jpeg'),
        ).rejects.toThrow('Cortana не успя да разчете документа');
      });

      it('should handle null values from Claude response', async () => {
        mockCreate.mockResolvedValue(
          submitInvoice({
            invoiceNumber: null,
            invoiceDate: null,
            supplierName: null,
            totalAmount: null,
            lineItems: [],
            confidence: 0.5,
          }),
        );

        const result = await service.parseInvoiceFromBase64('c1', 
          'base64data',
          'image/jpeg',
        );

        expect(result.invoiceNumber).toBeUndefined();
        expect(result.invoiceDate).toBeUndefined();
        expect(result.supplierName).toBeUndefined();
        expect(result.totalAmount).toBeUndefined();
      });

      it('should call Claude with correct model and parameters', async () => {
        mockCreate.mockResolvedValue(
          submitInvoice({ lineItems: [], confidence: 0.8 }),
        );

        await service.parseInvoiceFromBase64('c1', 'imagedata', 'image/png');

        expect(mockCreate).toHaveBeenCalledWith({
          model: 'claude-haiku-4-5',
          max_tokens: 4096,
          tools: [expect.objectContaining({ name: 'submit_invoice' })],
          tool_choice: { type: 'tool', name: 'submit_invoice' },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: 'imagedata',
                  },
                },
                {
                  type: 'text',
                  text: expect.stringContaining(
                    'submit the data with the submit_invoice tool',
                  ),
                },
              ],
            },
          ],
        });
      });

      it('should propagate Claude API errors', async () => {
        mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

        await expect(
          service.parseInvoiceFromBase64('c1', 'base64data', 'image/jpeg'),
        ).rejects.toThrow('API rate limit exceeded');
      });
    });

    describe('parseInvoice (from URL)', () => {
      it('should fetch image from URL and process it', async () => {
        const mockBuffer = Buffer.from('fake-image-data');
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockBuffer.buffer),
          headers: new Map([['content-type', 'image/png']]),
        }) as any;

        mockCreate.mockResolvedValue(
          submitInvoice({
            invoiceNumber: 'URL-001',
            lineItems: [],
            confidence: 0.9,
          }),
        );

        const result = await service.parseInvoice('c1', 
          'https://example.com/invoice.png',
        );

        expect(result.invoiceNumber).toBe('URL-001');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://example.com/invoice.png',
          { redirect: 'error' },
        );
      });

      it('should throw when image URL returns error', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        }) as any;

        await expect(
          service.parseInvoice('c1', 'https://example.com/missing.png'),
        ).rejects.toThrow('Failed to fetch image: Not Found');
      });
    });
  });

  describe('parseDeliveryInvoice (tool use)', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      mockAiSettings.getApiKeyForCompany.mockResolvedValue('test-api-key');
      mockAiSettings.getAiConfigForCompany.mockResolvedValue({
        apiKey: 'test-api-key',
        model: 'claude-haiku-4-5',
      });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentAIService,
          { provide: AiSettingsService, useValue: mockAiSettings },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();
      service = module.get<DocumentAIService>(DocumentAIService);
    });

    it('should execute search tools COMPANY-SCOPED and return the submitted result', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p1', name: 'LED лента 5050', sku: 'LED-5050', unit: 'M', purchasePrice: 2.5 },
      ]);
      // Turn 1: AI търси продукт; Turn 2: предава финалния резултат
      mockCreate
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            { type: 'tool_use', id: 't1', name: 'search_products', input: { query: 'LED strip' } },
          ],
        })
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 't2',
              name: 'submit_result',
              input: {
                invoiceNumber: 'ALI-001',
                invoiceDate: '2026-08-20',
                supplier: { matchedSupplierId: null, name: 'Shenzhen Lights Co' },
                items: [
                  {
                    description: 'LED Strip 5050 60led/m',
                    quantity: 100,
                    unitPrice: 2.1,
                    matchedProductId: 'p1',
                    matchedProductName: 'LED лента 5050',
                    matchConfidence: 0.9,
                  },
                ],
                confidence: 0.92,
              },
            },
          ],
        });

      const result = await service.parseDeliveryInvoice('c1', 'base64data', 'image/jpeg');

      // Tool търсенето е ограничено до компанията — гаранцията срещу изтичане
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'c1' }),
        }),
      );
      expect(result.invoiceNumber).toBe('ALI-001');
      expect(result.items[0].matchedProductId).toBe('p1');
      expect(result.supplier.name).toBe('Shenzhen Lights Co');
    });

    it('should propose a new product when nothing matches', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'submit_result',
            input: {
              supplier: { name: 'New Supplier' },
              items: [
                {
                  description: 'Solar Panel 450W',
                  quantity: 10,
                  unitPrice: 95,
                  matchedProductId: null,
                  newProduct: { name: 'Соларен панел 450W', sku: 'SP-450', unit: 'PIECE', purchasePrice: 95 },
                },
              ],
              confidence: 0.85,
            },
          },
        ],
      });

      const result = await service.parseDeliveryInvoice('c1', 'base64data', 'application/pdf');
      expect(result.items[0].matchedProductId).toBeNull();
      expect(result.items[0].newProduct?.name).toBe('Соларен панел 450W');
    });

    it('should give up with a clear error when the loop never submits', async () => {
      mockCreate.mockResolvedValue({ stop_reason: 'end_turn', content: [] });
      await expect(
        service.parseDeliveryInvoice('c1', 'base64data', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
    });

    it("should call Anthropic with the company's configured model", async () => {
      mockAiSettings.getAiConfigForCompany.mockResolvedValue({
        apiKey: 'test-api-key',
        model: 'claude-sonnet-5',
      });
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'submit_result',
            input: { supplier: {}, items: [], confidence: 0.9 },
          },
        ],
      });

      await service.parseDeliveryInvoice('c1', 'base64data', 'image/jpeg');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-sonnet-5' }),
      );
    });

    it('should reject when the company has no AI key', async () => {
      mockAiSettings.getApiKeyForCompany.mockResolvedValue(null);
      mockAiSettings.getAiConfigForCompany.mockResolvedValue(null);
      await expect(
        service.parseDeliveryInvoice('c1', 'base64data', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('reconcileBankStatement (tool use)', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      mockAiSettings.getApiKeyForCompany.mockResolvedValue('test-api-key');
      mockAiSettings.getAiConfigForCompany.mockResolvedValue({
        apiKey: 'test-api-key',
        model: 'claude-haiku-4-5',
      });
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.expense.findMany.mockResolvedValue([]);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentAIService,
          { provide: AiSettingsService, useValue: mockAiSettings },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();
      service = module.get<DocumentAIService>(DocumentAIService);
    });

    it('should keep ALL search tools company-scoped', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockCreate
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            { type: 'tool_use', id: 't1', name: 'search_orders', input: { amount: 6900 } },
            { type: 'tool_use', id: 't2', name: 'search_invoices', input: { query: 'F-001' } },
            { type: 'tool_use', id: 't3', name: 'search_expenses', input: { amount: 850 } },
          ],
        })
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 't4',
              name: 'submit_result',
              input: { rows: [], confidence: 0.9 },
            },
          ],
        });

      await service.reconcileBankStatement('c1', 'base64pdf');

      // Тенант-изолацията: всяко търсене носи companyId на компанията
      for (const mock of [
        mockPrisma.order.findMany,
        mockPrisma.invoice.findMany,
        mockPrisma.expense.findMany,
      ]) {
        expect(mock).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ companyId: 'c1' }),
          }),
        );
      }
    });

    it('should return matched rows and server-computed awaiting orders', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'submit_result',
            input: {
              rows: [
                {
                  date: '2026-08-20',
                  counterparty: 'АД КОМПЛЕКС',
                  amount: 6900,
                  direction: 'in',
                  match: { type: 'order', id: 'o1', label: 'ORD-2026-00024', confidence: 0.95 },
                },
                { counterparty: 'Такса пакет', amount: 12, direction: 'out', match: null },
              ],
              confidence: 0.9,
            },
          },
        ],
      });
      // Неплатени поръчки: o1 е мачната в извлечението → отпада; o2 остава
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'o1', orderNumber: 'ORD-24', customerName: 'АД', total: 6900, paidAmount: 0, orderDate: new Date('2026-08-10') },
        { id: 'o2', orderNumber: 'ORD-20', customerName: 'СЕВАН', total: 3600, paidAmount: 0, orderDate: new Date('2026-07-01') },
      ]);

      const result = await service.reconcileBankStatement('c1', 'base64pdf');

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].match?.id).toBe('o1');
      expect(result.rows[1].match).toBeNull();
      expect(result.awaitingOrders).toHaveLength(1);
      expect(result.awaitingOrders[0].orderNumber).toBe('ORD-20');
    });

    it('should flag recorded expenses that have no row in the statement', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'submit_result',
            input: {
              rows: [
                {
                  date: '2026-08-05',
                  counterparty: 'ЕВН',
                  amount: 120,
                  direction: 'out',
                  match: { type: 'expense', id: 'e1', label: 'Ток август', confidence: 0.95 },
                },
                { date: '2026-08-28', counterparty: 'Такса пакет', amount: 12, direction: 'out', match: null },
              ],
              confidence: 0.9,
            },
          },
        ],
      });
      // e1 е мачнат; e2 е дубликат без ред в извлечението
      mockPrisma.expense.findMany.mockResolvedValue([
        { id: 'e1', description: 'Ток август', totalAmount: 120, expenseDate: new Date('2026-08-05'), status: 'PAID', paymentMethod: 'BANK_TRANSFER', supplier: { name: 'ЕВН' } },
        { id: 'e2', description: 'Ток август', totalAmount: 120, expenseDate: new Date('2026-08-06'), status: 'PAID', paymentMethod: null, supplier: null },
      ]);

      const result = await service.reconcileBankStatement('c1', 'base64pdf');

      expect(result.unmatchedExpenses).toHaveLength(1);
      expect(result.unmatchedExpenses[0].id).toBe('e2');
      // Търсенето е за периода на извлечението и само за банкови/картови/неизвестни
      const call = mockPrisma.expense.findMany.mock.calls.at(-1)![0];
      expect(call.where.companyId).toBe('c1');
      expect(call.where.OR).toEqual([
        { paymentMethod: { in: ['BANK_TRANSFER', 'CARD'] } },
        { paymentMethod: null },
      ]);
      const period = call.where.AND[0].OR[0].paidAt;
      expect(period.gte).toEqual(new Date('2026-08-05'));
      expect(period.lte.getTime()).toBeGreaterThanOrEqual(new Date('2026-08-28').getTime());
    });

    it('should skip the reverse expense check when no row has a date', async () => {
      mockCreate.mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'submit_result',
            input: { rows: [{ amount: 12, direction: 'out', match: null }], confidence: 0.9 },
          },
        ],
      });

      const result = await service.reconcileBankStatement('c1', 'base64pdf');

      expect(result.unmatchedExpenses).toEqual([]);
      expect(mockPrisma.expense.findMany).not.toHaveBeenCalled();
    });

    it('should reject when the company has no AI key', async () => {
      mockAiSettings.getAiConfigForCompany.mockResolvedValue(null);
      await expect(
        service.reconcileBankStatement('c1', 'base64pdf'),
      ).rejects.toThrow(BadRequestException);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should delete a finished job after its terminal status is read', async () => {
      mockCreate.mockResolvedValue({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'submit_result',
            input: { rows: [], confidence: 0.9 },
          },
        ],
      });

      const jobId = service.startReconcileJob('c1', 'base64pdf');
      // Изчакваме фоновата задача да завърши
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));

      const first = service.getReconcileJob('c1', jobId);
      expect(first.status).toBe('done');
      // Второ четене: записът вече е изтрит от паметта
      expect(() => service.getReconcileJob('c1', jobId)).toThrow(
        BadRequestException,
      );
    });

    it('should NOT delete a job that is still running', async () => {
      let resolveCreate!: (value: unknown) => void;
      mockCreate.mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
      );

      const jobId = service.startReconcileJob('c1', 'base64pdf');
      expect(service.getReconcileJob('c1', jobId).status).toBe('running');
      // Повторно четене докато тече — записът трябва да е още там
      expect(service.getReconcileJob('c1', jobId).status).toBe('running');

      resolveCreate({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'submit_result',
            input: { rows: [], confidence: 0.9 },
          },
        ],
      });
      await new Promise((resolve) => setImmediate(resolve));
      await new Promise((resolve) => setImmediate(resolve));
      expect(service.getReconcileJob('c1', jobId).status).toBe('done');
    });
  });

  describe('when API key is NOT configured', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      mockAiSettings.getApiKeyForCompany.mockResolvedValue(null);
      mockAiSettings.getAiConfigForCompany.mockResolvedValue(null);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentAIService,
          { provide: AiSettingsService, useValue: mockAiSettings },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      service = module.get<DocumentAIService>(DocumentAIService);
    });

    it('should not be enabled', async () => {
      await expect(service.isEnabledForCompany('c1')).resolves.toBe(false);
    });

    it('should reject parseInvoiceFromBase64 with a clear error', async () => {
      await expect(
        service.parseInvoiceFromBase64('c1', 'base64data', 'image/jpeg'),
      ).rejects.toThrow(BadRequestException);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should reject parseInvoice with a clear error', async () => {
      await expect(
        service.parseInvoice('c1', 'https://example.com/invoice.png'),
      ).rejects.toThrow(BadRequestException);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
