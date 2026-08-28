import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorMessages } from '../common/constants/error-messages';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productCode?: string;
}

// ==================== Сканиране на доставка (tool use) ====================

export interface DeliveryScanItem {
  description: string;
  quantity: number;
  unitPrice: number;
  productCode?: string | null;
  /** Намерен съществуващ продукт на компанията (AI-ят търси с tool) */
  matchedProductId?: string | null;
  matchedProductName?: string | null;
  matchConfidence?: number | null;
  /** Предложение за нов продукт, когато нищо не съвпада */
  newProduct?: {
    name: string;
    sku?: string | null;
    unit?: string | null;
    purchasePrice?: number | null;
  } | null;
}

export interface DeliveryScanResult {
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  totalAmount?: number | null;
  vatAmount?: number | null;
  supplier: {
    matchedSupplierId?: string | null;
    matchedSupplierName?: string | null;
    /** Данни за нов доставчик, когато нищо не съвпада */
    name?: string | null;
    vatNumber?: string | null;
    address?: string | null;
  };
  items: DeliveryScanItem[];
  confidence: number;
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

  // Всяка компания работи със СВОЯ Anthropic ключ (Настройки > АИ) —
  // няма глобален env fallback, вкл. за нашите собствени компании.
  constructor(
    private aiSettings: AiSettingsService,
    private prisma: PrismaService,
  ) {}

  async isEnabledForCompany(companyId: string): Promise<boolean> {
    return (await this.aiSettings.getApiKeyForCompany(companyId)) !== null;
  }

  private async getClient(
    companyId: string,
  ): Promise<{ client: Anthropic; model: string }> {
    const config = await this.aiSettings.getAiConfigForCompany(companyId);
    if (!config) {
      throw new BadRequestException(ErrorMessages.ai.notConfigured);
    }
    return { client: new Anthropic({ apiKey: config.apiKey }), model: config.model };
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
  async parseInvoice(
    companyId: string,
    imageUrl: string,
  ): Promise<ParsedInvoiceData> {
    const { client, model } = await this.getClient(companyId);

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

      return await this.callClaude(client, model, base64Image, mimeType);
    } catch (error) {
      this.logger.error('Failed to parse invoice:', error);
      throw error;
    }
  }

  /**
   * Parse invoice from base64 image data using Claude Vision
   */
  async parseInvoiceFromBase64(
    companyId: string,
    base64Data: string,
    mimeType: string,
  ): Promise<ParsedInvoiceData> {
    const { client, model } = await this.getClient(companyId);

    try {
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
      return await this.callClaude(client, model, base64Image, mimeType);
    } catch (error) {
      this.logger.error('Failed to parse invoice from base64:', error);
      throw error;
    }
  }

  /**
   * Сканиране на доставна фактура с tool use: Claude сам търси в продуктите
   * и доставчиците НА КОМПАНИЯТА (двата tool-а са твърдо companyId-скопирани)
   * и връща per ред мачнат продукт или предложение за нов. Семантичното
   * търсене хваща и „LED Strip 5050" ↔ „LED лента 5050" — нещо, което
   * словесният fuzzy match не може.
   */
  async parseDeliveryInvoice(
    companyId: string,
    base64Data: string,
    mimeType: string,
  ): Promise<DeliveryScanResult> {
    const { client, model } = await this.getClient(companyId);
    const base64Image = base64Data.replace(/^data:[\w/]+;base64,/, '');

    const documentBlock: Anthropic.ContentBlockParam =
      mimeType === 'application/pdf'
        ? {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Image },
          }
        : {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Image,
            },
          };

    const tools: Anthropic.Tool[] = [
      {
        name: 'search_products',
        description:
          "Search the company's product catalog by name or SKU. Product names may be in Bulgarian while the invoice is in another language — try translated/simplified queries (e.g. 'LED лента' for 'LED strip'). Returns up to 5 matches.",
        input_schema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
      {
        name: 'search_suppliers',
        description:
          "Search the company's suppliers by name or VAT number. Returns up to 5 matches.",
        input_schema: {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query'],
        },
      },
      {
        name: 'submit_result',
        description:
          'Submit the final structured result. Call this exactly once, after you have searched for the supplier and for every line item.',
        input_schema: {
          type: 'object',
          properties: {
            invoiceNumber: { type: ['string', 'null'] },
            invoiceDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
            totalAmount: { type: ['number', 'null'] },
            vatAmount: { type: ['number', 'null'] },
            supplier: {
              type: 'object',
              properties: {
                matchedSupplierId: { type: ['string', 'null'] },
                matchedSupplierName: { type: ['string', 'null'] },
                name: { type: ['string', 'null'] },
                vatNumber: { type: ['string', 'null'] },
                address: { type: ['string', 'null'] },
              },
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                  productCode: { type: ['string', 'null'] },
                  matchedProductId: { type: ['string', 'null'] },
                  matchedProductName: { type: ['string', 'null'] },
                  matchConfidence: { type: ['number', 'null'] },
                  newProduct: {
                    type: ['object', 'null'],
                    properties: {
                      name: { type: 'string' },
                      sku: { type: ['string', 'null'] },
                      unit: {
                        type: ['string', 'null'],
                        enum: ['PIECE', 'KG', 'G', 'L', 'ML', 'M', 'CM', 'M2', 'M3', 'PACK', 'BOX', 'SET', 'HOUR', null],
                      },
                      purchasePrice: { type: ['number', 'null'] },
                    },
                    required: ['name'],
                  },
                },
                required: ['description', 'quantity', 'unitPrice'],
              },
            },
            confidence: { type: 'number' },
          },
          required: ['supplier', 'items', 'confidence'],
        },
      },
    ];

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: [
          documentBlock,
          {
            type: 'text',
            text: `This is a supplier invoice for a goods delivery. Extract the data and match it against the company's records:

1. Use search_suppliers to find the supplier (try the name and the VAT number).
2. For EVERY line item use search_products to find an existing product. Product names may be in Bulgarian — try translated or simplified queries. Only set matchedProductId when you are reasonably sure it is the same product (set matchConfidence 0-1). If nothing matches, propose newProduct with a sensible Bulgarian name, the SKU/code from the invoice if present, a unit from the allowed list and the purchase price.
3. Finish by calling submit_result exactly once with everything. Dates in YYYY-MM-DD. Prices as plain numbers in the invoice currency.`,
          },
        ],
      },
    ];

    // Agent loop: изпълняваме tool заявките (company-скопирани) до submit_result
    const MAX_TURNS = 12;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        tools,
        messages,
      });

      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      const submit = toolUses.find((block) => block.name === 'submit_result');
      if (submit) {
        return this.normalizeDeliveryResult(submit.input as DeliveryScanResult);
      }

      if (toolUses.length === 0 || response.stop_reason !== 'tool_use') {
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await this.executeSearchTool(
          companyId,
          toolUse.name,
          toolUse.input as { query?: string },
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    throw new BadRequestException(
      'AI анализът не успя да завърши. Опитайте отново или въведете доставката ръчно.',
    );
  }

  // Двата search tool-а — ВИНАГИ ограничени до companyId
  private async executeSearchTool(
    companyId: string,
    toolName: string,
    input: { query?: string },
  ) {
    const query = (input.query || '').trim();
    if (!query) return [];

    if (toolName === 'search_products') {
      return this.prisma.product.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, sku: true, unit: true, purchasePrice: true },
        take: 5,
      });
    }
    if (toolName === 'search_suppliers') {
      return this.prisma.supplier.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { vatNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, vatNumber: true },
        take: 5,
      });
    }
    return [];
  }

  private normalizeDeliveryResult(raw: DeliveryScanResult): DeliveryScanResult {
    return {
      invoiceNumber: raw.invoiceNumber || null,
      invoiceDate: raw.invoiceDate ? this.parseDate(raw.invoiceDate) : null,
      totalAmount: raw.totalAmount ?? null,
      vatAmount: raw.vatAmount ?? null,
      supplier: raw.supplier || {},
      items: (raw.items || []).map((item) => ({
        description: item.description || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        productCode: item.productCode || null,
        matchedProductId: item.matchedProductId || null,
        matchedProductName: item.matchedProductName || null,
        matchConfidence: item.matchConfidence ?? null,
        newProduct: item.newProduct?.name ? item.newProduct : null,
      })),
      confidence: raw.confidence || 0.8,
    };
  }

  private async callClaude(
    client: Anthropic,
    model: string,
    base64Image: string,
    mimeType: string,
  ): Promise<ParsedInvoiceData> {
    // PDF фактури минават като document block; снимки — като image block
    const documentBlock: Anthropic.ContentBlockParam =
      mimeType === 'application/pdf'
        ? {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Image,
            },
          }
        : {
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
          };

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            documentBlock,
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
