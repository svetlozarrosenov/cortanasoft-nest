import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentAIService } from './document-ai.service';

// Mock the Anthropic SDK
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

const mockConfigService = {
  get: jest.fn(),
};

describe('DocumentAIService', () => {
  let service: DocumentAIService;

  describe('when API key is configured', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      mockConfigService.get.mockReturnValue('test-api-key');

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentAIService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<DocumentAIService>(DocumentAIService);
    });

    it('should be enabled', () => {
      expect(service.isEnabled()).toBe(true);
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

        mockCreate.mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify(claudeResponse) }],
        });

        const result = await service.parseInvoiceFromBase64(
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
        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                lineItems: [],
                confidence: 0.8,
              }),
            },
          ],
        });

        await service.parseInvoiceFromBase64(
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

      it('should handle JSON wrapped in markdown code fences', async () => {
        const jsonData = {
          invoiceNumber: 'F-100',
          lineItems: [
            {
              description: 'Item 1',
              quantity: 1,
              unitPrice: 100,
              totalPrice: 100,
            },
          ],
          confidence: 0.9,
        };

        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: '```json\n' + JSON.stringify(jsonData) + '\n```',
            },
          ],
        });

        const result = await service.parseInvoiceFromBase64(
          'base64data',
          'image/png',
        );

        expect(result.invoiceNumber).toBe('F-100');
        expect(result.lineItems).toHaveLength(1);
      });

      it('should parse Bulgarian date format DD.MM.YYYY', async () => {
        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                invoiceDate: '15.06.2024',
                lineItems: [],
                confidence: 0.85,
              }),
            },
          ],
        });

        const result = await service.parseInvoiceFromBase64(
          'base64data',
          'image/jpeg',
        );

        expect(result.invoiceDate).toBe('2024-06-15');
      });

      it('should handle missing line item fields gracefully', async () => {
        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                lineItems: [
                  { description: 'Some item' },
                  { quantity: 5, unitPrice: 10 },
                ],
                confidence: 0.7,
              }),
            },
          ],
        });

        const result = await service.parseInvoiceFromBase64(
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

      it('should return empty result when response is not parseable', async () => {
        mockCreate.mockResolvedValue({
          content: [
            { type: 'text', text: 'Sorry, I cannot process this image.' },
          ],
        });

        const result = await service.parseInvoiceFromBase64(
          'base64data',
          'image/jpeg',
        );

        expect(result.lineItems).toHaveLength(0);
        // When parseJsonResponse returns { lineItems: [], confidence: 0 },
        // callClaude applies fallback: parsed.confidence || 0.8 → 0.8
        expect(result.confidence).toBe(0.8);
      });

      it('should handle null values from Claude response', async () => {
        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                invoiceNumber: null,
                invoiceDate: null,
                supplierName: null,
                totalAmount: null,
                lineItems: [],
                confidence: 0.5,
              }),
            },
          ],
        });

        const result = await service.parseInvoiceFromBase64(
          'base64data',
          'image/jpeg',
        );

        expect(result.invoiceNumber).toBeUndefined();
        expect(result.invoiceDate).toBeUndefined();
        expect(result.supplierName).toBeUndefined();
        expect(result.totalAmount).toBeUndefined();
      });

      it('should call Claude with correct model and parameters', async () => {
        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({ lineItems: [], confidence: 0.8 }),
            },
          ],
        });

        await service.parseInvoiceFromBase64('imagedata', 'image/png');

        expect(mockCreate).toHaveBeenCalledWith({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
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
                    'Analyze this invoice image and extract the data as JSON',
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
          service.parseInvoiceFromBase64('base64data', 'image/jpeg'),
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

        mockCreate.mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                invoiceNumber: 'URL-001',
                lineItems: [],
                confidence: 0.9,
              }),
            },
          ],
        });

        const result = await service.parseInvoice(
          'https://example.com/invoice.png',
        );

        expect(result.invoiceNumber).toBe('URL-001');
        expect(global.fetch).toHaveBeenCalledWith(
          'https://example.com/invoice.png',
        );
      });

      it('should throw when image URL returns error', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          statusText: 'Not Found',
        }) as any;

        await expect(
          service.parseInvoice('https://example.com/missing.png'),
        ).rejects.toThrow('Failed to fetch image: Not Found');
      });
    });
  });

  describe('when API key is NOT configured', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      mockConfigService.get.mockReturnValue(undefined);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DocumentAIService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<DocumentAIService>(DocumentAIService);
    });

    it('should not be enabled', () => {
      expect(service.isEnabled()).toBe(false);
    });

    it('should return empty result for parseInvoiceFromBase64', async () => {
      const result = await service.parseInvoiceFromBase64(
        'base64data',
        'image/jpeg',
      );

      expect(result).toEqual({ lineItems: [], confidence: 0 });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return empty result for parseInvoice', async () => {
      const result = await service.parseInvoice(
        'https://example.com/invoice.png',
      );

      expect(result).toEqual({ lineItems: [], confidence: 0 });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
