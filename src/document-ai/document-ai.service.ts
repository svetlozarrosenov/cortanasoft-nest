import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productCode?: string;
}

export interface ParsedInvoiceData {
  invoiceNumber?: string;
  invoiceDate?: string;
  supplierName?: string;
  supplierVatNumber?: string;
  supplierAddress?: string;
  totalAmount?: number;
  vatAmount?: number;
  subtotal?: number;
  lineItems: InvoiceLineItem[];
  rawText?: string;
  confidence: number;
}

@Injectable()
export class DocumentAIService {
  private readonly logger = new Logger(DocumentAIService.name);
  private isConfigured = false;
  private anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'Anthropic API not configured. Set ANTHROPIC_API_KEY in .env',
      );
      return;
    }

    this.anthropic = new Anthropic({ apiKey });
    this.isConfigured = true;
    this.logger.log('Anthropic Claude API configured successfully');
  }

  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Parse an invoice image from URL using Claude Vision
   */
  async parseInvoice(imageUrl: string): Promise<ParsedInvoiceData> {
    if (!this.isConfigured) {
      this.logger.warn('Claude API not configured, returning empty result');
      return { lineItems: [], confidence: 0 };
    }

    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const mimeType =
        imageResponse.headers.get('content-type') || 'image/jpeg';

      return await this.callClaude(base64Image, mimeType);
    } catch (error) {
      this.logger.error('Failed to parse invoice:', error);
      throw error;
    }
  }

  /**
   * Parse invoice from base64 image data using Claude Vision
   */
  async parseInvoiceFromBase64(
    base64Data: string,
    mimeType: string,
  ): Promise<ParsedInvoiceData> {
    if (!this.isConfigured) {
      this.logger.warn('Claude API not configured, returning empty result');
      return { lineItems: [], confidence: 0 };
    }

    try {
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
      return await this.callClaude(base64Image, mimeType);
    } catch (error) {
      this.logger.error('Failed to parse invoice from base64:', error);
      throw error;
    }
  }

  private async callClaude(
    base64Image: string,
    mimeType: string,
  ): Promise<ParsedInvoiceData> {
    const response = await this.anthropic.messages.create({
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
                media_type: mimeType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Analyze this invoice image and extract the data as JSON. Return ONLY valid JSON, no markdown, no code fences, no explanation.

Required JSON structure:
{
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "supplierName": "string or null",
  "supplierVatNumber": "string or null",
  "supplierAddress": "string or null",
  "totalAmount": number or null,
  "vatAmount": number or null,
  "subtotal": number or null,
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "productCode": "string or null"
    }
  ],
  "confidence": number between 0 and 1
}

Rules:
- Extract ALL line items from the invoice
- Dates must be in YYYY-MM-DD format
- Numbers must be plain numbers (no currency symbols)
- If a value is not found, use null
- confidence: your estimate of extraction accuracy (0-1)
- For line items: calculate missing totalPrice = quantity * unitPrice if possible
- The invoice may be in Bulgarian or any other language - extract data regardless of language`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    const parsed = this.parseJsonResponse(text);

    return {
      invoiceNumber: parsed.invoiceNumber || undefined,
      invoiceDate: parsed.invoiceDate
        ? this.parseDate(parsed.invoiceDate)
        : undefined,
      supplierName: parsed.supplierName || undefined,
      supplierVatNumber: parsed.supplierVatNumber || undefined,
      supplierAddress: parsed.supplierAddress || undefined,
      totalAmount: parsed.totalAmount ?? undefined,
      vatAmount: parsed.vatAmount ?? undefined,
      subtotal: parsed.subtotal ?? undefined,
      lineItems: (parsed.lineItems || []).map((item: any) => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        productCode: item.productCode || undefined,
      })),
      confidence: parsed.confidence || 0.8,
    };
  }

  private parseJsonResponse(text: string): any {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON block from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          this.logger.error('Failed to parse extracted JSON from response');
        }
      }

      this.logger.error(
        'Failed to parse Claude response as JSON:',
        text.substring(0, 200),
      );
      return { lineItems: [], confidence: 0 };
    }
  }

  private parseDate(value: string): string {
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Try to parse ISO string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try Bulgarian date format DD.MM.YYYY
    const bgMatch = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (bgMatch) {
      const [, day, month, year] = bgMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return value;
  }
}
