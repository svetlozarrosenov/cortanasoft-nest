import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService, MailAttachment } from '../mail/mail.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  QueryPeriodDto,
  QueryArchivesDto,
  CreateBankStatementDto,
  UpdateAccountantSettingsDto,
  SendToAccountantDto,
} from './dto';

@Injectable()
export class AccountantService {
  private readonly logger = new Logger(AccountantService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private uploads: UploadsService,
  ) {}

  // Half-open period [start, end) for the given year/month.
  private periodRange(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
  }

  private paging(query: QueryPeriodDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    return { page, limit, skip: (page - 1) * limit };
  }

  // Select-ът, от който се смята основа/ДДС на доставка (редове + прикачени разходи).
  private static readonly RECEIPT_BREAKDOWN_SELECT = {
    items: {
      select: {
        quantity: true,
        unitPrice: true,
        exchangeRate: true,
        vatRate: true,
      },
    },
    expenses: { select: { amount: true, vatAmount: true } },
  } as const;

  /**
   * Основа/ДДС на доставка, изчислени от артикулните редове (vatRate е по ред)
   * + прикачените към нея разходи. Същата формула като recalcReceiptState в
   * goods-receipts (totalAmount = base + vat), затова сборът съвпада със
   * запазеното total до стотинка-две разлика от закръгляне.
   */
  private receiptBreakdown(receipt: {
    items: {
      quantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      exchangeRate: Prisma.Decimal;
      vatRate: Prisma.Decimal;
    }[];
    expenses: { amount: Prisma.Decimal; vatAmount: Prisma.Decimal }[];
  }): { base: number; vat: number } {
    let base = 0;
    let vat = 0;
    for (const it of receipt.items) {
      const lineBase =
        Number(it.quantity) * Number(it.unitPrice) * Number(it.exchangeRate);
      base += lineBase;
      vat += lineBase * (Number(it.vatRate) / 100);
    }
    for (const e of receipt.expenses) {
      base += Number(e.amount);
      vat += Number(e.vatAmount);
    }
    return {
      base: Math.round(base * 100) / 100,
      vat: Math.round(vat * 100) / 100,
    };
  }

  /**
   * Income register — issued (non-draft, non-cancelled) invoices for the month.
   * Single-table query → DB-level pagination (scales to 10k+).
   */
  async income(companyId: string, query: QueryPeriodDto) {
    const { start, end } = this.periodRange(query.year, query.month);
    const { page, limit, skip } = this.paging(query);

    const where: Prisma.InvoiceWhereInput = {
      companyId,
      invoiceDate: { gte: start, lt: end },
      status: { notIn: ['DRAFT', 'CANCELLED'] },
      // Легаси редове отпреди отделянето на проформите — не са данъчен документ.
      type: { not: 'PROFORMA' },
    };

    const [data, total, agg] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { invoiceDate: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          status: true,
          customerName: true,
          customerEik: true,
          customerVatNumber: true,
          subtotal: true,
          vatAmount: true,
          total: true,
          paidAmount: true,
          currency: { select: { code: true, symbol: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.aggregate({
        where,
        _sum: { subtotal: true, vatAmount: true, total: true },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sums: {
          subtotal: Number(agg._sum?.subtotal || 0),
          vatAmount: Number(agg._sum?.vatAmount || 0),
          total: Number(agg._sum?.total || 0),
        },
      },
    };
  }

  /**
   * Expense register — purchase invoices for the month:
   *   • deliveries (goods receipts) that carry a supplier invoice
   *   • standalone expenses with an invoice (not attached to a delivery)
   * "Only records with an invoice" — a delivery-attached expense has no invoice
   * of its own (it's on the delivery's invoice), so it is excluded.
   * Merged + sorted by date, then paginated.
   */
  async expenses(companyId: string, query: QueryPeriodDto) {
    const { start, end } = this.periodRange(query.year, query.month);
    const { page, limit, skip } = this.paging(query);

    const [receipts, standaloneExpenses, baseCurrency] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          invoiceNumber: { not: null },
          OR: [
            { invoiceDate: { gte: start, lt: end } },
            { invoiceDate: null, receiptDate: { gte: start, lt: end } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          receiptDate: true,
          totalAmount: true,
          attachmentUrl: true,
          supplier: { select: { name: true, eik: true, vatNumber: true } },
          currency: { select: { code: true, symbol: true } },
          ...AccountantService.RECEIPT_BREAKDOWN_SELECT,
        },
      }),
      this.prisma.expense.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          goodsReceiptId: null,
          invoiceNumber: { not: null },
          expenseDate: { gte: start, lt: end },
        },
        select: {
          id: true,
          description: true,
          invoiceNumber: true,
          expenseDate: true,
          amount: true,
          vatAmount: true,
          totalAmount: true,
          attachmentUrl: true,
          supplier: { select: { name: true, eik: true, vatNumber: true } },
          currency: { select: { code: true, symbol: true } },
        },
      }),
      this.baseCurrencyCode(companyId),
    ]);

    type Row = {
      id: string;
      source: 'DELIVERY' | 'EXPENSE';
      date: Date;
      documentNumber: string | null;
      supplierName: string | null;
      supplierEik: string | null;
      supplierVat: string | null;
      base: number;
      vat: number;
      total: number;
      fileUrl: string | null;
      currencyCode: string | null;
    };

    const rows: Row[] = [
      ...receipts.map((r) => {
        const { base, vat } = this.receiptBreakdown(r);
        return {
          id: r.id,
          source: 'DELIVERY' as const,
          date: r.invoiceDate || r.receiptDate,
          documentNumber: r.invoiceNumber,
          supplierName: r.supplier?.name || null,
          supplierEik: r.supplier?.eik || null,
          supplierVat: r.supplier?.vatNumber || null,
          base,
          vat,
          total: Number(r.totalAmount),
          fileUrl: r.attachmentUrl || null,
          // totalAmount на доставка е конвертиран (редове × курс) → базова валута.
          currencyCode: baseCurrency,
        };
      }),
      ...standaloneExpenses.map((e) => ({
        id: e.id,
        source: 'EXPENSE' as const,
        date: e.expenseDate,
        documentNumber: e.invoiceNumber,
        supplierName: e.supplier?.name || e.description,
        supplierEik: e.supplier?.eik || null,
        supplierVat: e.supplier?.vatNumber || null,
        base: Number(e.amount),
        vat: Number(e.vatAmount),
        total: Number(e.totalAmount),
        fileUrl: e.attachmentUrl || null,
        currencyCode: e.currency?.code || baseCurrency,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const total = rows.length;
    const sums = rows.reduce(
      (acc, r) => ({
        base: acc.base + r.base,
        vat: acc.vat + r.vat,
        total: acc.total + r.total,
      }),
      { base: 0, vat: 0, total: 0 },
    );

    return {
      data: rows.slice(skip, skip + limit),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sums: {
          base: Math.round(sums.base * 100) / 100,
          vat: Math.round(sums.vat * 100) / 100,
          total: Math.round(sums.total * 100) / 100,
        },
      },
    };
  }

  /** Bank statements for a month (or year if month not narrowed), paginated. */
  async statements(companyId: string, query: QueryPeriodDto) {
    const { page, limit, skip } = this.paging(query);
    const where = {
      companyId,
      year: query.year,
      month: query.month,
    };

    const [data, total] = await Promise.all([
      this.prisma.bankStatement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bankStatement.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createStatement(companyId: string, dto: CreateBankStatementDto) {
    return this.prisma.bankStatement.create({
      data: {
        companyId,
        year: dto.year,
        month: dto.month,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName || null,
        notes: dto.notes || null,
      },
    });
  }

  async deleteStatement(companyId: string, id: string) {
    const statement = await this.prisma.bankStatement.findFirst({
      where: { id, companyId },
    });
    if (!statement) throw new NotFoundException('Bank statement not found');
    await this.prisma.bankStatement.delete({ where: { id } });
    return { success: true };
  }

  // SES v1 SendRawEmail отказва сурови съобщения над 10MB, а base64 надува
  // прикачените файлове с ~37% → безопасният таван за прикачено съдържание е ~7MB.
  static readonly MAX_EMAIL_ATTACHMENTS = 7 * 1024 * 1024;

  // Default email template (used when the company hasn't customised it).
  // Placeholders: {{company}}, {{month}}, {{year}}.
  static readonly DEFAULT_SUBJECT = 'Счетоводни документи — {{month}}/{{year}}';
  static readonly DEFAULT_BODY = `Здравейте,

Изпращаме Ви счетоводните документи на {{company}} за {{month}}/{{year}}:
— опис на приходните фактури,
— опис на разходните фактури,
— банково извлечение.

Поздрави,
{{company}}
(изпратено автоматично от CortanaSoft)`;

  async getSettings(companyId: string) {
    const settings = await this.prisma.accountantSettings.findUnique({
      where: { companyId },
    });
    return {
      accountantEmail: settings?.accountantEmail || null,
      accountantName: settings?.accountantName || null,
      emailSubject: settings?.emailSubject || null,
      emailBody: settings?.emailBody || null,
      // The effective template the recipient would get (custom or default).
      defaultSubject: AccountantService.DEFAULT_SUBJECT,
      defaultBody: AccountantService.DEFAULT_BODY,
    };
  }

  async updateSettings(companyId: string, dto: UpdateAccountantSettingsDto) {
    const data = {
      ...(dto.accountantEmail !== undefined && {
        accountantEmail: dto.accountantEmail || null,
      }),
      ...(dto.accountantName !== undefined && {
        accountantName: dto.accountantName || null,
      }),
      ...(dto.emailSubject !== undefined && {
        emailSubject: dto.emailSubject || null,
      }),
      ...(dto.emailBody !== undefined && { emailBody: dto.emailBody || null }),
    };
    await this.prisma.accountantSettings.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });
    return this.getSettings(companyId);
  }

  // ===== Register (Excel) + send =====

  /** Базовата валута на фирмата (код) — за конвертираните суми на доставките. */
  private async baseCurrencyCode(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { currency: { select: { code: true } } },
    });
    return company?.currency?.code || 'BGN';
  }

  /** All income invoices for the month (no pagination) — for the register. */
  private async allIncomeRows(companyId: string, start: Date, end: Date) {
    return this.prisma.invoice.findMany({
      where: {
        companyId,
        invoiceDate: { gte: start, lt: end },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        type: { not: 'PROFORMA' },
      },
      orderBy: { invoiceDate: 'asc' },
      select: {
        invoiceNumber: true,
        invoiceDate: true,
        customerName: true,
        customerEik: true,
        customerVatNumber: true,
        subtotal: true,
        vatAmount: true,
        total: true,
        currency: { select: { code: true } },
      },
    });
  }

  /** All expense rows (deliveries + standalone, with invoice) for the month. */
  private async allExpenseRows(companyId: string, start: Date, end: Date) {
    const [receipts, expenses] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          invoiceNumber: { not: null },
          OR: [
            { invoiceDate: { gte: start, lt: end } },
            { invoiceDate: null, receiptDate: { gte: start, lt: end } },
          ],
        },
        select: {
          invoiceNumber: true,
          invoiceDate: true,
          receiptDate: true,
          totalAmount: true,
          supplier: { select: { name: true, eik: true, vatNumber: true } },
          ...AccountantService.RECEIPT_BREAKDOWN_SELECT,
        },
      }),
      this.prisma.expense.findMany({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          goodsReceiptId: null,
          invoiceNumber: { not: null },
          expenseDate: { gte: start, lt: end },
        },
        select: {
          description: true,
          invoiceNumber: true,
          expenseDate: true,
          amount: true,
          vatAmount: true,
          totalAmount: true,
          supplier: { select: { name: true, eik: true, vatNumber: true } },
          currency: { select: { code: true } },
        },
      }),
    ]);

    const rows = [
      ...receipts.map((r) => {
        const { base, vat } = this.receiptBreakdown(r);
        return {
          type: 'Доставка',
          date: r.invoiceDate || r.receiptDate,
          documentNumber: r.invoiceNumber || '',
          supplierName: r.supplier?.name || '',
          supplierEik: r.supplier?.eik || '',
          supplierVat: r.supplier?.vatNumber || '',
          base,
          vat,
          total: Number(r.totalAmount),
          // Сумите на доставка са конвертирани → базова валута (null = базова).
          currencyCode: null as string | null,
        };
      }),
      ...expenses.map((e) => ({
        type: 'Разход',
        date: e.expenseDate,
        documentNumber: e.invoiceNumber || '',
        supplierName: e.supplier?.name || e.description,
        supplierEik: e.supplier?.eik || '',
        supplierVat: e.supplier?.vatNumber || '',
        base: Number(e.amount),
        vat: Number(e.vatAmount),
        total: Number(e.totalAmount),
        currencyCode: e.currency?.code || null,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    return rows;
  }

  /** Build an .xlsx workbook with an income sheet and an expense sheet. */
  private async buildRegisterBuffer(
    companyId: string,
    year: number,
    month: number,
  ): Promise<Buffer> {
    const { start, end } = this.periodRange(year, month);
    const [income, expenses, baseCurrency] = await Promise.all([
      this.allIncomeRows(companyId, start, end),
      this.allExpenseRows(companyId, start, end),
      this.baseCurrencyCode(companyId),
    ]);

    const wb = new ExcelJS.Workbook();
    const fmtDate = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

    const incomeSheet = wb.addWorksheet('Приходи');
    incomeSheet.columns = [
      { header: 'Фактура №', key: 'num', width: 18 },
      { header: 'Дата', key: 'date', width: 12 },
      { header: 'Клиент', key: 'customer', width: 32 },
      { header: 'ЕИК', key: 'eik', width: 16 },
      { header: 'ДДС №', key: 'vatNo', width: 16 },
      { header: 'Основа', key: 'base', width: 14 },
      { header: 'ДДС', key: 'vat', width: 14 },
      { header: 'Общо', key: 'total', width: 14 },
      { header: 'Валута', key: 'currency', width: 10 },
    ];
    income.forEach((r) =>
      incomeSheet.addRow({
        num: r.invoiceNumber,
        date: fmtDate(r.invoiceDate),
        customer: r.customerName,
        eik: r.customerEik || '',
        vatNo: r.customerVatNumber || '',
        base: Number(r.subtotal),
        vat: Number(r.vatAmount),
        total: Number(r.total),
        currency: r.currency?.code || baseCurrency,
      }),
    );

    const expenseSheet = wb.addWorksheet('Разходи');
    expenseSheet.columns = [
      { header: 'Тип', key: 'type', width: 12 },
      { header: 'Дата', key: 'date', width: 12 },
      { header: 'Документ №', key: 'num', width: 18 },
      { header: 'Доставчик', key: 'supplier', width: 32 },
      { header: 'ЕИК', key: 'eik', width: 16 },
      { header: 'ДДС №', key: 'vatNo', width: 16 },
      { header: 'Основа', key: 'base', width: 14 },
      { header: 'ДДС', key: 'vat', width: 14 },
      { header: 'Общо', key: 'total', width: 14 },
      { header: 'Валута', key: 'currency', width: 10 },
    ];
    expenses.forEach((r) =>
      expenseSheet.addRow({
        type: r.type,
        date: fmtDate(r.date),
        num: r.documentNumber,
        supplier: r.supplierName,
        eik: r.supplierEik,
        vatNo: r.supplierVat,
        base: r.base,
        vat: r.vat,
        total: r.total,
        currency: r.currencyCode || baseCurrency,
      }),
    );

    [incomeSheet, expenseSheet].forEach((sheet) => {
      sheet.getRow(1).font = { bold: true };
    });

    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getRegister(companyId: string, year: number, month: number) {
    const buffer = await this.buildRegisterBuffer(companyId, year, month);
    return {
      buffer,
      filename: `opis-${year}-${String(month).padStart(2, '0')}.xlsx`,
    };
  }

  private fillTemplate(tpl: string, vars: Record<string, string>): string {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  }

  /**
   * Съдържание на банково извлечение за прикачване към имейл.
   * `fileUrl` пази R2 ключ (uploadInvoice връща `{ url: key }`); стари записи
   * може да носят пълен URL — тогава теглим по HTTP.
   */
  private async statementContent(
    fileUrl: string,
  ): Promise<{ content: Buffer; contentType?: string } | null> {
    if (/^https?:\/\//i.test(fileUrl)) {
      const res = await fetch(fileUrl);
      if (!res.ok) return null;
      return { content: Buffer.from(await res.arrayBuffer()) };
    }
    const { stream, contentType } = await this.uploads.getFile(fileUrl);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return { content: Buffer.concat(chunks), contentType };
  }

  /** Email the monthly package (Excel registers + bank statements) to the accountant. */
  async sendToAccountant(companyId: string, dto: SendToAccountantDto) {
    const [settings, company] = await Promise.all([
      this.getSettings(companyId),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      }),
    ]);

    if (!settings.accountantEmail) {
      throw new BadRequestException(
        'Не е зададен имейл на счетоводителя (Настройки).',
      );
    }

    const vars = {
      company: company?.name || '',
      month: String(dto.month).padStart(2, '0'),
      year: String(dto.year),
    };
    const subject = this.fillTemplate(
      settings.emailSubject || AccountantService.DEFAULT_SUBJECT,
      vars,
    );
    const bodyText = this.fillTemplate(
      settings.emailBody || AccountantService.DEFAULT_BODY,
      vars,
    );
    const html = bodyText
      .split('\n')
      .map((line) => (line.trim() ? `<p>${line}</p>` : '<br/>'))
      .join('');

    // Registers (Excel)
    const { buffer, filename } = await this.getRegister(
      companyId,
      dto.year,
      dto.month,
    );
    const attachments: MailAttachment[] = [
      {
        filename,
        content: buffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ];

    // Bank statements for the month. Държим общия размер под SES тавана —
    // извлечение, което би го надхвърлило, се пропуска (описът пак тръгва).
    const statements = await this.prisma.bankStatement.findMany({
      where: { companyId, year: dto.year, month: dto.month },
    });
    let attachedBytes = buffer.length;
    let skippedStatements = 0;
    for (const s of statements) {
      try {
        const file = await this.statementContent(s.fileUrl);
        if (!file) continue;
        if (
          attachedBytes + file.content.length >
          AccountantService.MAX_EMAIL_ATTACHMENTS
        ) {
          skippedStatements++;
          continue;
        }
        attachedBytes += file.content.length;
        attachments.push({
          filename:
            s.fileName ||
            `izvlechenie-${dto.year}-${String(dto.month).padStart(2, '0')}.pdf`,
          content: file.content,
          ...(file.contentType ? { contentType: file.contentType } : {}),
        });
      } catch {
        // Skip a statement that can't be fetched; the email still goes out.
      }
    }
    if (skippedStatements > 0) {
      this.logger.warn(
        `sendToAccountant(${companyId} ${dto.year}-${dto.month}): skipped ${skippedStatements} statement(s) over the email size cap`,
      );
    }

    await this.mail.send({
      to: settings.accountantEmail,
      subject,
      html,
      attachments,
    });

    // Архивиране (best-effort) — reuse-ваме вече построения опис.
    await this.recordArchive(
      companyId,
      dto.year,
      dto.month,
      settings.accountantEmail,
      buffer,
    );

    return { success: true, sentTo: settings.accountantEmail, attachments: attachments.length };
  }

  /**
   * Email a pre-built package ZIP (built on the frontend, may include income
   * invoice PDFs for small volumes) as a single attachment.
   */
  async sendPackage(
    companyId: string,
    year: number,
    month: number,
    file?: { buffer: Buffer; originalname?: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Липсва файл на пакета.');
    }
    if (file.buffer.length > AccountantService.MAX_EMAIL_ATTACHMENTS) {
      throw new BadRequestException(
        'Пакетът е твърде голям за имейл. Свалете го и го изпратете ръчно.',
      );
    }

    const [settings, company] = await Promise.all([
      this.getSettings(companyId),
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      }),
    ]);
    if (!settings.accountantEmail) {
      throw new BadRequestException(
        'Не е зададен имейл на счетоводителя (Настройки).',
      );
    }

    const vars = {
      company: company?.name || '',
      month: String(month).padStart(2, '0'),
      year: String(year),
    };
    const subject = this.fillTemplate(
      settings.emailSubject || AccountantService.DEFAULT_SUBJECT,
      vars,
    );
    const html = this.fillTemplate(
      settings.emailBody || AccountantService.DEFAULT_BODY,
      vars,
    )
      .split('\n')
      .map((line) => (line.trim() ? `<p>${line}</p>` : '<br/>'))
      .join('');

    await this.mail.send({
      to: settings.accountantEmail,
      subject,
      html,
      attachments: [
        {
          filename: file.originalname || `paket-${vars.year}-${vars.month}.zip`,
          content: file.buffer,
          contentType: 'application/zip',
        },
      ],
    });

    // Архивиране (best-effort) — описът се построява отделно (клиентът праща ZIP).
    await this.recordArchive(companyId, year, month, settings.accountantEmail);

    return { success: true, sentTo: settings.accountantEmail, attachments: 1 };
  }

  // ===== Архив на изпратените пакети =====

  /** Брой документи по вид за периода (за архивния запис и прегледа). */
  private async countsForPeriod(companyId: string, year: number, month: number) {
    const { start, end } = this.periodRange(year, month);
    const [income, receipts, expenses, statement] = await Promise.all([
      this.prisma.invoice.count({
        where: {
          companyId,
          invoiceDate: { gte: start, lt: end },
          status: { notIn: ['DRAFT', 'CANCELLED'] },
          type: { not: 'PROFORMA' },
        },
      }),
      this.prisma.goodsReceipt.count({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          invoiceNumber: { not: null },
          OR: [
            { invoiceDate: { gte: start, lt: end } },
            { invoiceDate: null, receiptDate: { gte: start, lt: end } },
          ],
        },
      }),
      this.prisma.expense.count({
        where: {
          companyId,
          status: { not: 'CANCELLED' },
          goodsReceiptId: null,
          invoiceNumber: { not: null },
          expenseDate: { gte: start, lt: end },
        },
      }),
      this.prisma.bankStatement.count({ where: { companyId, year, month } }),
    ]);
    return { income, expense: receipts + expenses, statement };
  }

  /**
   * Записва архив на изпратения пакет. Best-effort: имейлът вече е тръгнал, така
   * че при грешка (напр. R2 недостъпен) само логваме, без да чупим заявката.
   * Пази само Excel описа (snapshot) + бройки — виж модела за причината.
   */
  private async recordArchive(
    companyId: string,
    year: number,
    month: number,
    sentTo: string,
    prebuiltRegister?: Buffer,
  ) {
    try {
      const buffer =
        prebuiltRegister ||
        (await this.buildRegisterBuffer(companyId, year, month));
      const { key } = await this.uploads.uploadBuffer(
        companyId,
        'accountant',
        buffer,
        '.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      const counts = await this.countsForPeriod(companyId, year, month);
      await this.prisma.accountantArchive.create({
        data: {
          companyId,
          year,
          month,
          sentTo,
          registerKey: key,
          incomeCount: counts.income,
          expenseCount: counts.expense,
          statementCount: counts.statement,
        },
      });
    } catch (err) {
      this.logger.error('Failed to record accountant archive', err as Error);
    }
  }

  /** Списък с изпратени пакети (по подразбиране всички, сортирани по дата). */
  async listArchives(companyId: string, query: QueryArchivesDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const where: Prisma.AccountantArchiveWhereInput = {
      companyId,
      ...(query.year ? { year: Number(query.year) } : {}),
      ...(query.month ? { month: Number(query.month) } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.accountantArchive.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.accountantArchive.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async deleteArchive(companyId: string, id: string) {
    const archive = await this.prisma.accountantArchive.findFirst({
      where: { id, companyId },
    });
    if (!archive) throw new NotFoundException('Архивът не е намерен');
    await this.uploads.deleteFile(archive.registerKey);
    await this.prisma.accountantArchive.delete({ where: { id } });
    return { success: true };
  }
}
