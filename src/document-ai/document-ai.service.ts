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

// ==================== Съгласуване на банково извлечение ====================

export interface ReconcileRowMatch {
  type: 'order' | 'invoice' | 'expense';
  id: string;
  label: string;
  amount?: number | null;
  confidence: number;
}

export interface ReconcileRow {
  date?: string | null;
  counterparty?: string | null;
  description?: string | null;
  amount: number;
  direction: 'in' | 'out';
  match?: ReconcileRowMatch | null;
}

export interface ReconcileResult {
  rows: ReconcileRow[];
  confidence: number;
  /** Потвърдени+ поръчки без плащане — „очаквано, но неполучено" (сървърно) */
  awaitingOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    paidAmount: number;
    orderDate: Date;
  }[];
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

  // Превежда грешките от Anthropic в ясни съобщения (стигат до оператора в
  // респонса като 400) и логва суровата грешка за дебъг.
  private mapAnthropicError(error: unknown): never {
    // Anthropic.APIError може да липсва при mock-нат SDK в тестовете
    const ApiError = (Anthropic as unknown as { APIError?: new () => Error })
      .APIError;
    if (ApiError && error instanceof ApiError) {
      const apiError = error as unknown as { status?: number; message?: string };
      this.logger.error(
        `Anthropic API error: status=${apiError.status} message=${apiError.message}`,
      );
      const msg = (apiError.message || '').toLowerCase();
      if (apiError.status === 401) {
        throw new BadRequestException(
          'Невалиден Anthropic API ключ. Проверете го в Настройки > АИ.',
        );
      }
      if (msg.includes('credit balance')) {
        throw new BadRequestException(
          'Anthropic ключът е без кредити. Заредете от console.anthropic.com → Billing и опитайте отново.',
        );
      }
      if (apiError.status === 429) {
        throw new BadRequestException(
          'Достигнат е лимитът на Anthropic акаунта (429). Изчакайте минута и опитайте отново.',
        );
      }
      if (apiError.status === 529) {
        throw new BadRequestException(
          'Anthropic е претоварен в момента (529). Опитайте отново след малко.',
        );
      }
      throw new BadRequestException(
        `Грешка от Anthropic (${apiError.status}): ${apiError.message}`,
      );
    }
    this.logger.error('Non-Anthropic error in AI flow', error as Error);
    throw error;
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
      const response = await client.messages
        .create({ model, max_tokens: 4096, tools, messages })
        .catch((error) => this.mapAnthropicError(error));

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

  /**
   * Съгласуване на банково извлечение (tool use): Claude чете PDF-а и мачва
   * всеки ред срещу поръчките/фактурите/разходите НА КОМПАНИЯТА. Всички
   * tool-ове са ТВЪРДО companyId-скопирани — AI-ят физически няма достъп до
   * данни на друга компания. „Очаквано, но неполучено" се смята сървърно.
   */
  async reconcileBankStatement(
    companyId: string,
    base64Pdf: string,
  ): Promise<ReconcileResult> {
    const { client, model } = await this.getClient(companyId);

    const tools: Anthropic.Tool[] = [
      {
        name: 'search_orders',
        description:
          "Search the company's sales orders. Filter by approximate amount and/or a text query (order number or customer name). Returns up to 5 with payment status.",
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            amount: { type: 'number' },
          },
        },
      },
      {
        name: 'search_invoices',
        description:
          "Search the company's issued invoices by number, customer name or approximate total. Returns up to 5 with status.",
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            amount: { type: 'number' },
          },
        },
      },
      {
        name: 'search_expenses',
        description:
          "Search the company's expenses by description/supplier or approximate amount. Returns up to 5.",
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            amount: { type: 'number' },
          },
        },
      },
      {
        name: 'submit_result',
        description:
          'Submit the final structured reconciliation. Call exactly once, after every statement row has been searched.',
        input_schema: {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
                  counterparty: { type: ['string', 'null'] },
                  description: { type: ['string', 'null'] },
                  amount: { type: 'number', description: 'positive number' },
                  direction: { type: 'string', enum: ['in', 'out'] },
                  match: {
                    type: ['object', 'null'],
                    properties: {
                      type: { type: 'string', enum: ['order', 'invoice', 'expense'] },
                      id: { type: 'string' },
                      label: { type: 'string' },
                      amount: { type: ['number', 'null'] },
                      confidence: { type: 'number' },
                    },
                    required: ['type', 'id', 'label', 'confidence'],
                  },
                },
                required: ['amount', 'direction'],
              },
            },
            confidence: { type: 'number' },
          },
          required: ['rows', 'confidence'],
        },
      },
    ];

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
          },
          {
            type: 'text',
            text: `This is a bank statement (likely Bulgarian, any bank format). Reconcile it against the company's records:

1. Extract EVERY transaction row: date, counterparty, payment reference/description, amount (positive number) and direction ('in' = money received, 'out' = money paid out). Skip opening/closing balance lines.
2. For every row try to find the matching record: incoming money usually matches a sales order or an issued invoice (search_orders / search_invoices — try the amount and any invoice/order number or customer name from the reference); outgoing money usually matches an expense (search_expenses). Bank fees, interest and card settlements usually have no match — leave match null.
3. Set match only when reasonably sure (confidence 0-1). When unsure, leave match null — a human reviews everything.
4. Finish by calling submit_result exactly once. Dates in YYYY-MM-DD, amounts as plain positive numbers.`,
          },
        ],
      },
    ];

    // Извлеченията имат много редове → повече ходове от доставките
    const MAX_TURNS = 20;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages
        .create({ model, max_tokens: 8192, tools, messages })
        .catch((error) => this.mapAnthropicError(error));

      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      const submit = toolUses.find((block) => block.name === 'submit_result');
      if (submit) {
        const raw = submit.input as { rows?: ReconcileRow[]; confidence?: number };
        return this.finalizeReconcileResult(companyId, raw);
      }

      if (toolUses.length === 0 || response.stop_reason !== 'tool_use') {
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await this.executeReconcileTool(
          companyId,
          toolUse.name,
          toolUse.input as { query?: string; amount?: number },
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
      'AI съгласуването не успя да завърши. Опитайте отново.',
    );
  }

  // Съгласувателните tool-ове — ВИНАГИ ограничени до companyId
  private async executeReconcileTool(
    companyId: string,
    toolName: string,
    input: { query?: string; amount?: number },
  ) {
    const query = (input.query || '').trim();
    const amount = typeof input.amount === 'number' ? input.amount : null;
    // ±1% толеранс за банкови такси/закръгляния при мачване по сума
    const amountFilter = (field: string) =>
      amount != null
        ? { [field]: { gte: amount * 0.99 - 0.01, lte: amount * 1.01 + 0.01 } }
        : {};

    if (toolName === 'search_orders') {
      if (!query && amount == null) return [];
      return this.prisma.order.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          ...amountFilter('total'),
          ...(query && {
            OR: [
              { orderNumber: { contains: query, mode: 'insensitive' } },
              { customerName: { contains: query, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          paidAmount: true,
          paymentStatus: true,
          orderDate: true,
        },
        orderBy: { orderDate: 'desc' },
        take: 5,
      });
    }
    if (toolName === 'search_invoices') {
      if (!query && amount == null) return [];
      return this.prisma.invoice.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          ...amountFilter('total'),
          ...(query && {
            OR: [
              { invoiceNumber: { contains: query, mode: 'insensitive' } },
              { customerName: { contains: query, mode: 'insensitive' } },
            ],
          }),
        },
        select: {
          id: true,
          invoiceNumber: true,
          customerName: true,
          total: true,
          status: true,
          invoiceDate: true,
        },
        orderBy: { invoiceDate: 'desc' },
        take: 5,
      });
    }
    if (toolName === 'search_expenses') {
      if (!query && amount == null) return [];
      return this.prisma.expense.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          ...amountFilter('totalAmount'),
          ...(query && {
            OR: [
              { description: { contains: query, mode: 'insensitive' } },
              { supplier: { name: { contains: query, mode: 'insensitive' } } },
            ],
          }),
        },
        select: {
          id: true,
          description: true,
          totalAmount: true,
          status: true,
          expenseDate: true,
          supplier: { select: { name: true } },
        },
        orderBy: { expenseDate: 'desc' },
        take: 5,
      });
    }
    return [];
  }

  // Нормализация + сървърно смятане на „очаквано, но неполучено"
  private async finalizeReconcileResult(
    companyId: string,
    raw: { rows?: ReconcileRow[]; confidence?: number },
  ): Promise<ReconcileResult> {
    const rows: ReconcileRow[] = (raw.rows || []).map((row) => ({
      date: row.date || null,
      counterparty: row.counterparty || null,
      description: row.description || null,
      amount: Math.abs(Number(row.amount) || 0),
      direction: row.direction === 'out' ? 'out' : 'in',
      match: row.match?.id
        ? {
            type: row.match.type,
            id: row.match.id,
            label: row.match.label || '',
            amount: row.match.amount ?? null,
            confidence: row.match.confidence ?? 0,
          }
        : null,
    }));

    // Потвърдени+ поръчки без пълно плащане, невидени в извлечението
    const matchedOrderIds = new Set(
      rows
        .filter((r) => r.match?.type === 'order')
        .map((r) => r.match!.id),
    );
    const unpaid = await this.prisma.order.findMany({
      where: {
        companyId,
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        paidAmount: true,
        orderDate: true,
      },
      orderBy: { orderDate: 'asc' },
      take: 30,
    });

    return {
      rows,
      confidence: raw.confidence || 0.8,
      awaitingOrders: unpaid
        .filter((o) => !matchedOrderIds.has(o.id))
        .map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          total: Number(o.total),
          paidAmount: Number(o.paidAmount ?? 0),
          orderDate: o.orderDate,
        })),
    };
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

    const response = await client.messages
      .create({
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
    })
      .catch((error) => this.mapAnthropicError(error));

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
