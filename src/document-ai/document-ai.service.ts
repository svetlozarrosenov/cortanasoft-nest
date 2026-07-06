import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

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

  /** True if an IP literal is loopback, private, link-local or CGNAT. */
  private isPrivateIp(ip: string): boolean {
    if (isIP(ip) === 4) {
      const [a, b] = ip.split('.').map(Number);
      if (a === 0 || a === 10 || a === 127) return true;
      if (a === 169 && b === 254) return true; // link-local / cloud metadata
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
      return false;
    }
    const v6 = ip.toLowerCase();
    if (v6 === '::1' || v6 === '::') return true;
    if (v6.startsWith('fc') || v6.startsWith('fd')) return true; // ULA
    if (v6.startsWith('fe80')) return true; // link-local
    if (v6.startsWith('::ffff:')) return this.isPrivateIp(v6.slice(7));
    return false;
  }

  /**
   * Reject anything that isn't a plain http(s) URL resolving to a public IP,
   * so a caller can't make the server reach internal services / cloud metadata.
   */
  private async assertSafePublicUrl(rawUrl: string): Promise<void> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Невалиден URL адрес');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new BadRequestException('Разрешени са само http(s) адреси');
    }
    const host = url.hostname;
    const addresses = isIP(host)
      ? [host]
      : (await lookup(host, { all: true })).map((r) => r.address);
    if (addresses.length === 0 || addresses.some((a) => this.isPrivateIp(a))) {
      throw new BadRequestException('Достъпът до вътрешни адреси е забранен');
    }
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
      // Guard against SSRF: imageUrl comes from the request body, so verify it
      // points at a public host before the server fetches it, and refuse to
      // follow redirects (which could bounce to an internal address).
      await this.assertSafePublicUrl(imageUrl);
      const imageResponse = await fetch(imageUrl, { redirect: 'error' });
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
