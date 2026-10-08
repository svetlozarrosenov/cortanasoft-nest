import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import {
  AiJobKind,
  AiJobStatus,
  ExpenseCategory,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
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
  /** Категория на реда (фактура с 10 разхода → 10 реда с различни категории) */
  category?: ExpenseCategory;
  /** ДДС ставка на реда в %, когато фактурата я показва (смесени ставки) */
  vatRate?: number;
}

// ==================== Сканиране на доставка (tool use) ====================

export interface DeliveryScanItem {
  description: string;
  quantity: number;
  unitPrice: number;
  productCode?: string | null;
  /** goods = стока за склада; cost = транспорт/мито/такса → допълнителен разход по доставката */
  kind?: 'goods' | 'cost' | null;
  /** Категория на разхода при kind = cost */
  costCategory?: ExpenseCategory | null;
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
  /** ДДС ставка на фактурата в % (за редовете-разходи) */
  vatRate?: number | null;
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
  /** internal / bank_fee = ред без документ по дизайн (id = type) */
  type: 'order' | 'invoice' | 'expense' | 'delivery' | 'internal' | 'bank_fee';
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

/** Токени/ходове на една AI операция — сумират се по всички отговори и се пишат в ai_jobs */
export interface AiUsage {
  model?: string;
  turns: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
}

export interface AiJobMeta {
  userId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
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
  /**
   * Разходи в периода на извлечението, които не са мачнати с нито един ред
   * (сървърно). „В брой" и наложен платеж се пропускат — те не минават през
   * банката; без начин на плащане (стари записи) — показват се за проверка.
   */
  unmatchedExpenses: {
    id: string;
    description: string;
    supplierName: string | null;
    totalAmount: number;
    expenseDate: Date;
    status: string;
    paymentMethod: string | null;
  }[];
  /**
   * Плащания по доставки (стокови разписки) в периода на извлечението, за
   * които няма мачнат ред. Същата логика като при разходите: „в брой" и
   * наложен платеж не минават през банката и се пропускат.
   */
  unmatchedDeliveries: {
    id: string;
    receiptNumber: string;
    invoiceNumber: string | null;
    supplierName: string | null;
    amount: number;
    paidAt: Date;
    method: string;
  }[];
}

// Редове без документ по дизайн — етикет по подразбиране, ако Claude не даде
const NON_RECORD_MATCH_LABELS: Partial<
  Record<ReconcileRowMatch['type'], string>
> = {
  internal: 'Вътрешен превод — собствена сметка / собственик',
  bank_fee: 'Банкова такса',
};

// Описания на категориите за промпта — Claude избира код от списъка
const EXPENSE_CATEGORY_HINTS = `  DELIVERY: shipping, couriers, transport services
  RENT: rent of premises, offices, warehouses
  UTILITIES: electricity, water, heating, gas, waste
  MARKETING: advertising, ads (Google/Meta), printing of promo materials, agencies
  OFFICE_SUPPLIES: stationery, paper, toner, small office consumables
  EQUIPMENT: machines, tools, computers, furniture, hardware purchases
  MAINTENANCE: repairs, servicing, cleaning, spare parts for own equipment/vehicles
  INSURANCE: insurance premiums of any kind
  TAXES: taxes, state/municipal fees, licences from authorities
  TRAVEL: business trips — tickets, per diems, taxi (hotels go to ACCOMMODATION)
  ACCOMMODATION: hotels, guest houses, apartments, lodging of any kind
  COMMUNICATION: phone, mobile, internet, hosting of communication services
  SOFTWARE: software licences, SaaS subscriptions, cloud, domains
  CONSULTING: accountants, lawyers, consultants, freelancers, professional services
  BANKING: bank fees, card processing fees, interest
  FUEL: fuel, petrol, diesel, LPG, EV charging for own vehicles and machines
  MATERIALS: raw materials, building materials, consumables and parts used in production or on sites
  VEHICLES: company cars and vans — leasing, repairs, tyres, parking, vignettes, car wash, road tax (fuel goes to FUEL)
  OTHER: anything that does not fit above`;
const EXPENSE_CATEGORY_CODES: string[] = Object.values(ExpenseCategory);
// Начини на плащане, които има смисъл да се четат от фактура за разход
const INVOICE_PAYMENT_METHOD_CODES: string[] = [
  'BANK_TRANSFER',
  'CASH',
  'CARD',
  'COD',
];

export interface ParsedInvoiceData {
  invoiceNumber?: string;
  invoiceDate?: string;
  // Падеж (срок за плащане); ако фактурата дава само срок в дни, се изчислява
  dueDate?: string;
  // Предложена категория на разхода (валидирана срещу ExpenseCategory)
  expenseCategory?: ExpenseCategory;
  // Начин на плащане, ако фактурата го посочва („Начин на плащане: банков път")
  paymentMethod?: PaymentMethod;
  // Данните на доставчика от фактурата — стигат за нов запис в „Доставчици"
  supplierName?: string;
  supplierEik?: string;
  supplierVatNumber?: string;
  supplierAddress?: string;
  supplierCity?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierBankName?: string;
  supplierIban?: string;
  supplierBic?: string;
  totalAmount?: number;
  vatAmount?: number;
  subtotal?: number;
  lineItems: InvoiceLineItem[];
  rawText?: string;
  confidence: number;
}

@Injectable()
export class DocumentAIService implements OnModuleInit {
  private readonly logger = new Logger(DocumentAIService.name);

  // Всяка компания работи със СВОЯ Anthropic ключ (Настройки > AI) —
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
    return {
      client: new Anthropic({ apiKey: config.apiKey }),
      model: config.model,
    };
  }

  // Prompt caching в агентния цикъл: фиксираният маркер върху документа покрива
  // само началото; историята (резултатите от търсенията) расте с всеки ход и
  // без втори, движещ се маркер се плаща наново. Анулираме предишния (API-то
  // позволява най-много 4) и маркираме последния tool_result — кешът се
  // намира по най-дългия съвпадащ префикс, затова старият запис остава
  // използваем. Измерено: 106k некеширани входни токена → 24 за 30-редов документ.
  private moveCacheBreakpoint(
    previous: Anthropic.ToolResultBlockParam | undefined,
    toolResults: Anthropic.ToolResultBlockParam[],
  ): Anthropic.ToolResultBlockParam | undefined {
    if (previous) delete previous.cache_control;
    const last = toolResults[toolResults.length - 1];
    if (last) last.cache_control = { type: 'ephemeral' };
    return last;
  }

  // Отрязан отговор (stop_reason max_tokens) = непълен tool input. SDK-то го
  // връща без грешка, затова го хващаме тук, вместо да подадем частичен резултат.
  private assertNotTruncated(response: Anthropic.Message) {
    if (response.stop_reason === 'max_tokens') {
      this.logger.warn(
        `AI response truncated at max_tokens (output ${response.usage?.output_tokens})`,
      );
      throw new BadRequestException(ErrorMessages.ai.outputTruncated);
    }
  }

  // Превежда грешките от Anthropic в ясни съобщения (стигат до оператора в
  // респонса като 400) и логва суровата грешка за дебъг.
  private mapAnthropicError(error: unknown): never {
    // Anthropic.APIError може да липсва при mock-нат SDK в тестовете
    const ApiError = (Anthropic as unknown as { APIError?: new () => Error })
      .APIError;
    if (ApiError && error instanceof ApiError) {
      const apiError = error as unknown as {
        status?: number;
        message?: string;
      };
      this.logger.error(
        `Anthropic API error: status=${apiError.status} message=${apiError.message}`,
      );
      const msg = (apiError.message || '').toLowerCase();
      if (apiError.status === 401) {
        throw new BadRequestException(
          'Невалиден Anthropic API ключ. Проверете го в Настройки > AI.',
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

  // ==================== AI задачи (ai_jobs) ====================
  // Дългите AI операции (съгласуване 1-2 мин, агентно сканиране на доставка
  // 30-90 сек) не могат да живеят в отворена HTTP заявка — прокситата
  // (Next.js rewrite 30 сек, nginx 60 сек) я убиват. POST стартира задача и
  // връща jobId веднага; frontend-ът пита за резултата. Задачите са в базата
  // (companyId-скопирани): оцеляват рестарт, а токените/времето дават справка
  // кой колко ползва AI. Не се трият автоматично.

  /** Промисите умират с процеса — каквото е останало RUNNING, е прекъснато. */
  async onModuleInit() {
    const { count } = await this.prisma.aiJob.updateMany({
      where: { status: AiJobStatus.RUNNING },
      data: {
        status: AiJobStatus.ERROR,
        message: 'Прекъснато при рестарт на сървъра. Опитайте отново.',
        finishedAt: new Date(),
      },
    });
    if (count > 0)
      this.logger.warn(`${count} AI job(s) interrupted by restart`);
  }

  private newUsage(model?: string): AiUsage {
    return {
      model,
      turns: 0,
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
    };
  }

  private trackUsage(usage: AiUsage | undefined, response: Anthropic.Message) {
    if (!usage) return;
    usage.turns += 1;
    usage.inputTokens += response.usage?.input_tokens ?? 0;
    usage.outputTokens += response.usage?.output_tokens ?? 0;
    usage.cacheReadTokens += response.usage?.cache_read_input_tokens ?? 0;
    usage.cacheWriteTokens += response.usage?.cache_creation_input_tokens ?? 0;
  }

  private async finishJob(
    jobId: string,
    usage: AiUsage,
    startedAt: number,
    outcome:
      | { status: 'DONE'; result: unknown }
      | { status: 'ERROR'; message: string },
  ) {
    await this.prisma.aiJob
      .update({
        where: { id: jobId },
        data: {
          status: outcome.status,
          result:
            outcome.status === 'DONE'
              ? (outcome.result as Prisma.InputJsonValue)
              : undefined,
          message: outcome.status === 'ERROR' ? outcome.message : undefined,
          model: usage.model,
          turns: usage.turns,
          inputTokens: usage.inputTokens,
          cacheReadTokens: usage.cacheReadTokens,
          cacheWriteTokens: usage.cacheWriteTokens,
          outputTokens: usage.outputTokens,
          durationMs: Date.now() - startedAt,
          finishedAt: new Date(),
        },
      })
      .catch((error: unknown) =>
        this.logger.error(`Failed to finish AI job ${jobId}`, error as Error),
      );
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof BadRequestException
      ? (error.getResponse() as { message?: string }).message || error.message
      : fallback;
  }

  /** Фонова задача: записва реда, пуска работата и връща jobId веднага. */
  private async startJob<T>(
    companyId: string,
    kind: AiJobKind,
    meta: AiJobMeta,
    work: (usage: AiUsage) => Promise<T>,
    failMessage: string,
  ): Promise<string> {
    const job = await this.prisma.aiJob.create({
      data: {
        companyId,
        kind,
        userId: meta.userId ?? null,
        fileName: meta.fileName ?? null,
        fileSize: meta.fileSize ?? null,
      },
      select: { id: true },
    });
    const usage = this.newUsage();
    const startedAt = Date.now();

    void work(usage)
      .then((result) =>
        this.finishJob(job.id, usage, startedAt, { status: 'DONE', result }),
      )
      .catch((error: unknown) => {
        this.logger.error(`AI job ${kind} failed`, error as Error);
        return this.finishJob(job.id, usage, startedAt, {
          status: 'ERROR',
          message: this.errorMessage(error, failMessage),
        });
      });

    return job.id;
  }

  /** Еднократна (синхронна) AI операция — пак се записва в ai_jobs за справката. */
  private async runTracked<T>(
    companyId: string,
    kind: AiJobKind,
    meta: AiJobMeta,
    work: (usage: AiUsage) => Promise<T>,
  ): Promise<T> {
    const job = await this.prisma.aiJob.create({
      data: {
        companyId,
        kind,
        userId: meta.userId ?? null,
        fileName: meta.fileName ?? null,
        fileSize: meta.fileSize ?? null,
      },
      select: { id: true },
    });
    const usage = this.newUsage();
    const startedAt = Date.now();
    try {
      const result = await work(usage);
      await this.finishJob(job.id, usage, startedAt, {
        status: 'DONE',
        result,
      });
      return result;
    } catch (error) {
      await this.finishJob(job.id, usage, startedAt, {
        status: 'ERROR',
        message: this.errorMessage(error, 'Грешка при AI анализа'),
      });
      throw error;
    }
  }

  /** Резултатът се дава САМО на компанията, стартирала задачата */
  private async readJob<T>(companyId: string, kind: AiJobKind, jobId: string) {
    const job = await this.prisma.aiJob.findFirst({
      where: { id: jobId, companyId, kind },
      select: { status: true, result: true, message: true },
    });
    if (!job) {
      throw new BadRequestException('Задачата не е намерена');
    }
    const status = { RUNNING: 'running', DONE: 'done', ERROR: 'error' }[
      job.status
    ] as 'running' | 'done' | 'error';
    return {
      status,
      result: (job.result ?? undefined) as T | undefined,
      message: job.message ?? undefined,
    };
  }

  startReconcileJob(
    companyId: string,
    base64Pdf: string,
    meta: AiJobMeta = {},
  ): Promise<string> {
    return this.startJob(
      companyId,
      AiJobKind.BANK_RECONCILE,
      meta,
      (usage) => this.reconcileBankStatement(companyId, base64Pdf, usage),
      'Съгласуването не успя. Опитайте отново.',
    );
  }

  getReconcileJob(companyId: string, jobId: string) {
    return this.readJob<ReconcileResult>(
      companyId,
      AiJobKind.BANK_RECONCILE,
      jobId,
    );
  }

  startDeliveryScanJob(
    companyId: string,
    base64Data: string,
    mimeType: string,
    meta: AiJobMeta = {},
  ): Promise<string> {
    return this.startJob(
      companyId,
      AiJobKind.DELIVERY_SCAN,
      meta,
      (usage) =>
        this.parseDeliveryInvoice(companyId, base64Data, mimeType, usage),
      'Сканирането не успя. Опитайте отново.',
    );
  }

  getDeliveryScanJob(companyId: string, jobId: string) {
    return this.readJob<DeliveryScanResult>(
      companyId,
      AiJobKind.DELIVERY_SCAN,
      jobId,
    );
  }

  /** Разчитане на фактура (разход) — синхронно, но се записва в ai_jobs. */
  scanExpenseDocument(
    companyId: string,
    base64Data: string,
    mimeType: string,
    meta: AiJobMeta = {},
  ) {
    return this.runTracked(companyId, AiJobKind.EXPENSE_SCAN, meta, (usage) =>
      this.parseInvoiceFromBase64(companyId, base64Data, mimeType, usage),
    );
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
    meta: AiJobMeta = {},
  ): Promise<ParsedInvoiceData> {
    return this.runTracked(
      companyId,
      AiJobKind.EXPENSE_SCAN,
      { ...meta, fileName: imageUrl },
      (usage) => this.parseInvoiceFromUrl(companyId, imageUrl, usage),
    );
  }

  private async parseInvoiceFromUrl(
    companyId: string,
    imageUrl: string,
    usage: AiUsage,
  ): Promise<ParsedInvoiceData> {
    const { client, model } = await this.getClient(companyId);
    usage.model = model;

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

      return await this.callClaude(client, model, base64Image, mimeType, usage);
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
    usage?: AiUsage,
  ): Promise<ParsedInvoiceData> {
    const { client, model } = await this.getClient(companyId);
    if (usage) usage.model = model;

    try {
      const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
      return await this.callClaude(client, model, base64Image, mimeType, usage);
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
    usage?: AiUsage,
  ): Promise<DeliveryScanResult> {
    const { client, model } = await this.getClient(companyId);
    if (usage) usage.model = model;
    const base64Image = base64Data.replace(/^data:[\w/]+;base64,/, '');

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
            invoiceDate: {
              type: ['string', 'null'],
              description: 'YYYY-MM-DD',
            },
            totalAmount: { type: ['number', 'null'] },
            vatAmount: { type: ['number', 'null'] },
            vatRate: {
              type: ['number', 'null'],
              description: 'VAT percentage applied on the invoice (20, 9 or 0)',
            },
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
                  kind: {
                    type: ['string', 'null'],
                    enum: ['goods', 'cost', null],
                    description:
                      'goods = a physical product entering stock; cost = a service/charge that is not stock (transport, shipping, freight, delivery, customs duty, packaging, handling, insurance, fees)',
                  },
                  costCategory: {
                    type: ['string', 'null'],
                    enum: [...EXPENSE_CATEGORY_CODES, null],
                    description: 'Only for kind = cost',
                  },
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
                        enum: [
                          'PIECE',
                          'KG',
                          'G',
                          'L',
                          'ML',
                          'M',
                          'CM',
                          'M2',
                          'M3',
                          'PACK',
                          'BOX',
                          'SET',
                          'HOUR',
                          null,
                        ],
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
2. Classify every line: kind "goods" for physical products that enter the warehouse; kind "cost" for services and charges that are NOT stock — transport, shipping, freight, delivery, customs duty, packaging, handling, insurance, bank/service fees. For cost lines set costCategory (DELIVERY for transport/shipping/freight/couriers, TAXES for customs duties, INSURANCE for insurance, OTHER otherwise), do NOT search products and do NOT propose newProduct.
3. For EVERY goods line use search_products to find an existing product. Product names may be in Bulgarian — try translated or simplified queries. Only set matchedProductId when you are reasonably sure it is the same product (set matchConfidence 0-1). If nothing matches, propose newProduct with a sensible Bulgarian name, the SKU/code from the invoice if present, a unit from the allowed list and the purchase price.
4. vatRate: the VAT percentage the invoice applies (20, 9 or 0); null if not visible.
5. Finish by calling submit_result exactly once with everything. Dates in YYYY-MM-DD. Prices as plain numbers in the invoice currency, without VAT.`,
            // Кешира целия префикс (tools + документ + инструкции) — всеки ход
            // от цикъла иначе го праща наново на пълна цена (30 реда = 10 хода
            // × ~10k входни токена)
            cache_control: { type: 'ephemeral' },
          },
        ],
      },
    ];

    // Agent loop: изпълняваме tool заявките (company-скопирани) до submit_result.
    // Документ с 30-40 реда дава submit_result от 6-7k изходни токена — при
    // 4096 отговорът се режеше и SDK-то връщаше частичен input (0 реда),
    // който минаваше за резултат („ИИ забрави", тикет #16 Инатех).
    const MAX_TURNS = 30;
    let cachedResult: Anthropic.ToolResultBlockParam | undefined;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages
        .create({ model, max_tokens: 16384, tools, messages })
        .catch((error) => this.mapAnthropicError(error));
      this.trackUsage(usage, response);
      this.assertNotTruncated(response);

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

      cachedResult = this.moveCacheBreakpoint(cachedResult, toolResults);
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
    usage?: AiUsage,
  ): Promise<ReconcileResult> {
    const { client, model } = await this.getClient(companyId);
    if (usage) usage.model = model;
    const companyContext = await this.reconcileCompanyContext(companyId);

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
        name: 'search_deliveries',
        description:
          "Search the company's supplier deliveries (goods receipts / purchase invoices) by delivery number, supplier invoice number, supplier name or approximate total. Returns up to 5 with payment status and the recorded payments.",
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
                      type: {
                        type: 'string',
                        enum: [
                          'order',
                          'invoice',
                          'expense',
                          'delivery',
                          'internal',
                          'bank_fee',
                        ],
                      },
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
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf,
            },
            // PDF-ът се кешира — иначе всеки ход от цикъла го праща наново
            // (бавно, скъпо и изяжда токен-лимита на по-ниските Anthropic tier-ове)
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: `This is a bank statement (likely Bulgarian, any bank format). Reconcile it against the company's records.

${companyContext}

1. Extract EVERY transaction row: date, counterparty, payment reference/description, amount (positive number) and direction ('in' = money received, 'out' = money paid out). Skip opening/closing balance lines.
2. For every row try to find the matching record: incoming money usually matches a sales order or an issued invoice (search_orders / search_invoices — try the amount and any invoice/order number or customer name from the reference); outgoing money usually matches either a supplier delivery (search_deliveries — try the amount, the supplier name or an invoice number from the reference; match type 'delivery') or a standalone expense (search_expenses; match type 'expense'). The bank counterparty is often a marketplace or payment processor (e.g. ALIBABA, PAYPAL, STRIPE) rather than the supplier recorded in the system — when a name search finds nothing, search by amount alone before giving up. A record whose payment method is CASH or COD did not go through the bank — do not match it to a statement row. Two kinds of rows have no document by design — classify them instead of leaving them unmatched: transfers where the counterparty is the company itself, its manager/owner (МОЛ) or one of its users (own accounts, owner deposits and withdrawals) → match {type:'internal', id:'internal'}; bank service fees, interest, card-acquiring settlements and similar bank charges → match {type:'bank_fee', id:'bank_fee'}. Everything else without a record → leave match null.
3. Set match only when reasonably sure (confidence 0-1). When unsure, leave match null — a human reviews everything.
4. Finish by calling submit_result exactly once. Dates in YYYY-MM-DD, amounts as plain positive numbers.`,
          },
        ],
      },
    ];

    // Извлеченията имат много редове → повече ходове от доставките
    const MAX_TURNS = 30;
    let cachedResult: Anthropic.ToolResultBlockParam | undefined;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages
        .create({ model, max_tokens: 16384, tools, messages })
        .catch((error) => this.mapAnthropicError(error));
      this.trackUsage(usage, response);
      this.assertNotTruncated(response);

      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      const submit = toolUses.find((block) => block.name === 'submit_result');
      if (submit) {
        const raw = submit.input as {
          rows?: ReconcileRow[];
          confidence?: number;
        };
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

      cachedResult = this.moveCacheBreakpoint(cachedResult, toolResults);
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }

    throw new BadRequestException(
      'AI съгласуването не успя да завърши. Опитайте отново.',
    );
  }

  /**
   * Кои сме „ние" — за да разпознае Cortana вътрешните преводи (собствена
   * сметка, собственик/МОЛ, потребители на фирмата) вместо да ги брои за
   * плащания без документ.
   */
  private async reconcileCompanyContext(companyId: string): Promise<string> {
    const [company, members] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, molName: true, iban: true, bankName: true },
      }),
      this.prisma.userCompany.findMany({
        where: { companyId },
        select: { user: { select: { firstName: true, lastName: true } } },
      }),
    ]);
    const people = Array.from(
      new Set(
        members
          .map((m) => `${m.user.firstName} ${m.user.lastName}`.trim())
          .filter(Boolean),
      ),
    );
    const lines = [
      `Company context (this statement belongs to this company):`,
      `- Company name: ${company?.name || 'unknown'}`,
      `- Manager/owner (МОЛ): ${company?.molName || 'unknown'}`,
      `- Own bank account: ${company?.iban || 'unknown'}${company?.bankName ? ` (${company.bankName})` : ''}`,
      `- People who use the system for this company: ${people.length ? people.join(', ') : 'unknown'}`,
      `Names may appear transliterated in Latin letters on the statement (e.g. "Svetlozar" for "Светлозар").`,
    ];
    return lines.join('\n');
  }

  // Съгласувателните tool-ове — ВИНАГИ ограничени до companyId
  private async executeReconcileTool(
    companyId: string,
    toolName: string,
    input: { query?: string; amount?: number },
  ) {
    const query = (input.query || '').trim();
    const amount = typeof input.amount === 'number' ? input.amount : null;
    const result = await this.runReconcileSearch(
      companyId,
      toolName,
      query,
      amount,
    );
    // Контрагентът в банката често е платформа/процесор (Alibaba, PayPal,
    // Stripe), а не доставчикът/клиентът от системата → име + сума дава нула.
    // Тогава търсим само по сума, за да не се губи очевидното съвпадение.
    if (result.length === 0 && query && amount != null) {
      return this.runReconcileSearch(companyId, toolName, '', amount);
    }
    return result;
  }

  private async runReconcileSearch(
    companyId: string,
    toolName: string,
    query: string,
    amount: number | null,
  ): Promise<unknown[]> {
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
          paymentMethod: true,
          supplier: { select: { name: true } },
        },
        orderBy: { expenseDate: 'desc' },
        take: 5,
      });
    }
    if (toolName === 'search_deliveries') {
      if (!query && amount == null) return [];
      const receipts = await this.prisma.goodsReceipt.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          ...amountFilter('totalAmount'),
          ...(query && {
            OR: [
              { receiptNumber: { contains: query, mode: 'insensitive' } },
              { invoiceNumber: { contains: query, mode: 'insensitive' } },
              { supplier: { name: { contains: query, mode: 'insensitive' } } },
            ],
          }),
        },
        select: {
          id: true,
          receiptNumber: true,
          invoiceNumber: true,
          invoiceDate: true,
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true,
          supplier: { select: { name: true } },
          payments: {
            select: { amount: true, paidAt: true, method: true },
            orderBy: { paidAt: 'desc' },
          },
        },
        orderBy: { receiptDate: 'desc' },
        take: 5,
      });
      return receipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        invoiceNumber: r.invoiceNumber,
        invoiceDate: r.invoiceDate,
        supplierName: r.supplier?.name ?? null,
        totalAmount: Number(r.totalAmount),
        paidAmount: Number(r.paidAmount),
        paymentStatus: r.paymentStatus,
        payments: r.payments.map((p) => ({
          amount: Number(p.amount),
          paidAt: p.paidAt,
          method: p.method,
        })),
      }));
    }
    return [];
  }

  // Нормализация + сървърно смятане на „очаквано, но неполучено"
  private async finalizeReconcileResult(
    companyId: string,
    raw: { rows?: ReconcileRow[]; confidence?: number },
  ): Promise<ReconcileResult> {
    const rows: ReconcileRow[] = (raw.rows || []).map((row) => {
      const nonRecordLabel = row.match
        ? NON_RECORD_MATCH_LABELS[row.match.type]
        : undefined;
      const match: ReconcileRowMatch | null =
        row.match && (row.match.id || nonRecordLabel)
          ? {
              type: row.match.type,
              // Редове „без документ по дизайн" нямат запис → id = типът
              id: nonRecordLabel ? row.match.type : row.match.id,
              label: row.match.label || nonRecordLabel || '',
              amount: row.match.amount ?? null,
              confidence: row.match.confidence ?? 0,
            }
          : null;
      return {
        date: row.date || null,
        counterparty: row.counterparty || null,
        description: row.description || null,
        amount: Math.abs(Number(row.amount) || 0),
        direction: row.direction === 'out' ? 'out' : 'in',
        match,
      };
    });

    // Периодът на извлечението = min–max дата от разчетените редове
    const rowDates = rows
      .map((r) => (r.date ? new Date(r.date) : null))
      .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()));
    const periodEnd =
      rowDates.length > 0
        ? new Date(Math.max(...rowDates.map((d) => d.getTime())))
        : null;
    if (periodEnd) periodEnd.setHours(23, 59, 59, 999);

    // Потвърдени+ поръчки без пълно плащане, невидени в извлечението.
    // Само с банков превод — наложен платеж, в брой, карта и пощенски
    // превод не идват като отделен ред по банка. И само създадени преди
    // края на извлечението — по-нови няма как да са в него.
    const matchedOrderIds = new Set(
      rows.filter((r) => r.match?.type === 'order').map((r) => r.match!.id),
    );
    const unpaid = await this.prisma.order.findMany({
      where: {
        companyId,
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        paymentMethod: 'BANK_TRANSFER',
        ...(periodEnd && { orderDate: { lte: periodEnd } }),
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

    // Обратната проверка: разходи в периода на извлечението без ред в него.
    // Без дати няма как да се прецени кой разход е „трябвало" да е вътре →
    // пропуска се.
    const matchedExpenseIds = new Set(
      rows.filter((r) => r.match?.type === 'expense').map((r) => r.match!.id),
    );
    let unmatchedExpenses: ReconcileResult['unmatchedExpenses'] = [];
    let unmatchedDeliveries: ReconcileResult['unmatchedDeliveries'] = [];
    if (periodEnd) {
      const from = new Date(Math.min(...rowDates.map((d) => d.getTime())));
      const to = periodEnd;
      const inPeriod = { gte: from, lte: to };
      const candidates = await this.prisma.expense.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          OR: [
            { paymentMethod: { in: ['BANK_TRANSFER', 'CARD'] } },
            { paymentMethod: null },
          ],
          // Платен разход се търси по датата на плащане, иначе по датата на разхода
          AND: [
            {
              OR: [
                { paidAt: inPeriod },
                { paidAt: null, expenseDate: inPeriod },
              ],
            },
          ],
        },
        select: {
          id: true,
          description: true,
          totalAmount: true,
          expenseDate: true,
          status: true,
          paymentMethod: true,
          supplier: { select: { name: true } },
        },
        orderBy: { expenseDate: 'asc' },
        take: 60,
      });
      unmatchedExpenses = candidates
        .filter((e) => !matchedExpenseIds.has(e.id))
        .slice(0, 30)
        .map((e) => ({
          id: e.id,
          description: e.description,
          supplierName: e.supplier?.name ?? null,
          totalAmount: Number(e.totalAmount),
          expenseDate: e.expenseDate,
          status: e.status,
          paymentMethod: e.paymentMethod,
        }));

      // Същата обратна проверка за доставките: плащане по стокова разписка
      // (банка/карта) с дата в периода, чиято доставка не е мачната с ред.
      const matchedDeliveryIds = new Set(
        rows
          .filter((r) => r.match?.type === 'delivery')
          .map((r) => r.match!.id),
      );
      const deliveryPayments = await this.prisma.payment.findMany({
        where: {
          companyId,
          goodsReceiptId: { not: null },
          amount: { gt: 0 },
          method: { in: ['BANK_TRANSFER', 'CARD'] },
          paidAt: inPeriod,
          goodsReceipt: { status: { not: 'CANCELLED' } },
        },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          method: true,
          goodsReceipt: {
            select: {
              id: true,
              receiptNumber: true,
              invoiceNumber: true,
              supplier: { select: { name: true } },
            },
          },
        },
        orderBy: { paidAt: 'asc' },
        take: 60,
      });
      unmatchedDeliveries = deliveryPayments
        .filter(
          (p) => p.goodsReceipt && !matchedDeliveryIds.has(p.goodsReceipt.id),
        )
        .slice(0, 30)
        .map((p) => ({
          id: p.goodsReceipt!.id,
          receiptNumber: p.goodsReceipt!.receiptNumber,
          invoiceNumber: p.goodsReceipt!.invoiceNumber,
          supplierName: p.goodsReceipt!.supplier?.name ?? null,
          amount: Number(p.amount),
          paidAt: p.paidAt,
          method: p.method,
        }));
    }

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
      unmatchedExpenses,
      unmatchedDeliveries,
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
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          purchasePrice: true,
        },
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
      vatRate: typeof raw.vatRate === 'number' ? raw.vatRate : null,
      supplier: raw.supplier || {},
      items: (raw.items || []).map((item) => ({
        description: item.description || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        productCode: item.productCode || null,
        kind: item.kind === 'cost' ? 'cost' : 'goods',
        costCategory:
          item.kind === 'cost' &&
          EXPENSE_CATEGORY_CODES.includes(item.costCategory as string)
            ? (item.costCategory as ExpenseCategory)
            : item.kind === 'cost'
              ? 'DELIVERY'
              : null,
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
    usage?: AiUsage,
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

    // Резултатът се връща през tool, а не като текст: свободният отговор
    // понякога идва с преамбюл или отрязан JSON и парсването тихо връщаше
    // празен резултат — формата не се променяше и изглеждаше „не сработи".
    const submitTool: Anthropic.Tool = {
      name: 'submit_invoice',
      description:
        'Submit the extracted invoice data. Call this exactly once with everything you could read.',
      input_schema: {
        type: 'object',
        properties: {
          invoiceNumber: { type: ['string', 'null'] },
          invoiceDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
          dueDate: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
          supplierName: { type: ['string', 'null'] },
          supplierEik: {
            type: ['string', 'null'],
            description:
              'Bulgarian company id (ЕИК/БУЛСТАТ), 9 or 13 digits, digits only',
          },
          supplierVatNumber: { type: ['string', 'null'] },
          supplierAddress: { type: ['string', 'null'] },
          supplierCity: { type: ['string', 'null'] },
          supplierPhone: { type: ['string', 'null'] },
          supplierEmail: { type: ['string', 'null'] },
          supplierBankName: { type: ['string', 'null'] },
          supplierIban: { type: ['string', 'null'] },
          supplierBic: { type: ['string', 'null'] },
          totalAmount: { type: ['number', 'null'] },
          vatAmount: { type: ['number', 'null'] },
          subtotal: { type: ['number', 'null'] },
          expenseCategory: {
            type: ['string', 'null'],
            enum: [...EXPENSE_CATEGORY_CODES, null],
          },
          paymentMethod: {
            type: ['string', 'null'],
            enum: [...INVOICE_PAYMENT_METHOD_CODES, null],
          },
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
                totalPrice: { type: 'number' },
                productCode: { type: ['string', 'null'] },
                category: {
                  type: ['string', 'null'],
                  enum: [...EXPENSE_CATEGORY_CODES, null],
                  description: 'Expense category of THIS line',
                },
                vatRate: {
                  type: ['number', 'null'],
                  description:
                    'VAT percentage applied to this line (20, 9 or 0)',
                },
              },
              required: ['description', 'quantity', 'unitPrice'],
            },
          },
          confidence: { type: 'number' },
        },
        required: ['lineItems', 'confidence'],
      },
    };

    const response = await client.messages
      .create({
        model,
        max_tokens: 16384,
        tools: [submitTool],
        tool_choice: { type: 'tool', name: 'submit_invoice' },
        messages: [
          {
            role: 'user',
            content: [
              documentBlock,
              {
                type: 'text',
                text: `Analyze this invoice and submit the data with the submit_invoice tool.

Rules:
- Extract ALL line items from the invoice
- Dates must be in YYYY-MM-DD format
- dueDate is the payment due date ("падеж", "срок за плащане", "платимо до", "due date", "payment due"). If the invoice only states payment terms in days (e.g. "платимо в 10-дневен срок", "net 30"), compute dueDate = invoiceDate + N days. If nothing about payment term is stated, use null (do NOT guess and do NOT copy invoiceDate)
- The supplier is the ISSUER of the invoice ("Доставчик", "Получател на плащането"), never the buyer/recipient ("Получател", "Купувач"). Take the supplier fields only from the issuer block
- supplierEik: the issuer's ЕИК/БУЛСТАТ, digits only. If only a VAT number "BG123456789" is printed, put the digits in supplierEik as well
- supplierIban/supplierBic/supplierBankName: the issuer's bank details when the invoice prints them
- Numbers must be plain numbers (no currency symbols)
- expenseCategory: classify what the buyer is paying for, based on the supplier and the line items. Meanings:
${EXPENSE_CATEGORY_HINTS}
  Pick the single best match; use OTHER only when nothing else fits
- paymentMethod: only if the invoice states how it is paid ("Начин на плащане", "Плащане", "payment method"): "по банков път"/"банков превод"/"по сметка" → BANK_TRANSFER, "в брой" → CASH, "с карта"/"ПОС" → CARD, "наложен платеж" → COD. Otherwise null
- If a value is not found, use null
- confidence: your estimate of extraction accuracy (0-1)
- For line items: calculate missing totalPrice = quantity * unitPrice if possible; totalPrice is WITHOUT VAT
- For each line item set category (same meanings as expenseCategory — lines of one invoice may differ, e.g. tyres → MAINTENANCE and a vignette → TAXES) and vatRate (the VAT % applied to that line: 20, 9 or 0; null if the invoice does not show it)
- The invoice may be in Bulgarian or any other language - extract data regardless of language`,
              },
            ],
          },
        ],
      })
      .catch((error) => this.mapAnthropicError(error));
    this.trackUsage(usage, response);
    this.assertNotTruncated(response);

    const submitted = response.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use' && block.name === 'submit_invoice',
    );
    if (!submitted) {
      this.logger.error(
        'Claude did not call submit_invoice; stop_reason=' +
          String(response.stop_reason),
      );
      throw new BadRequestException(
        'Cortana не успя да разчете документа. Опитайте отново или попълнете данните ръчно.',
      );
    }
    const parsed = submitted.input as any;

    return {
      invoiceNumber: parsed.invoiceNumber || undefined,
      invoiceDate: parsed.invoiceDate
        ? this.parseDate(parsed.invoiceDate)
        : undefined,
      dueDate: parsed.dueDate ? this.parseDate(parsed.dueDate) : undefined,
      expenseCategory: EXPENSE_CATEGORY_CODES.includes(parsed.expenseCategory)
        ? (parsed.expenseCategory as ExpenseCategory)
        : undefined,
      supplierName: parsed.supplierName || undefined,
      supplierEik: parsed.supplierEik
        ? String(parsed.supplierEik).replace(/\D/g, '') || undefined
        : undefined,
      supplierVatNumber: parsed.supplierVatNumber || undefined,
      supplierAddress: parsed.supplierAddress || undefined,
      supplierCity: parsed.supplierCity || undefined,
      supplierPhone: parsed.supplierPhone || undefined,
      supplierEmail: parsed.supplierEmail || undefined,
      supplierBankName: parsed.supplierBankName || undefined,
      supplierIban: parsed.supplierIban || undefined,
      supplierBic: parsed.supplierBic || undefined,
      totalAmount: parsed.totalAmount ?? undefined,
      vatAmount: parsed.vatAmount ?? undefined,
      subtotal: parsed.subtotal ?? undefined,
      paymentMethod: INVOICE_PAYMENT_METHOD_CODES.includes(parsed.paymentMethod)
        ? (parsed.paymentMethod as PaymentMethod)
        : undefined,
      lineItems: (parsed.lineItems || []).map((item: any) => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        productCode: item.productCode || undefined,
        category: EXPENSE_CATEGORY_CODES.includes(item.category)
          ? (item.category as ExpenseCategory)
          : undefined,
        vatRate: typeof item.vatRate === 'number' ? item.vatRate : undefined,
      })),
      confidence: parsed.confidence || 0.8,
    };
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
