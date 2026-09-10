import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
} from '../common/guards/permissions.guard';
import {
  DocumentAIService,
  ParsedInvoiceData,
  DeliveryScanResult,
} from './document-ai.service';
import { UploadsService } from '../uploads/uploads.service';
import { PrismaService } from '../prisma/prisma.service';

// NB: глобалният ValidationPipe е с whitelist:true — полета БЕЗ декоратор
// се режат от тялото. Всяко DTO поле тук трябва да носи валидатор.
class ScanInvoiceDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  base64Image?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

class ScanExpenseAttachmentDto {
  // R2 ключ на вече прикачения към разхода документ (Expense.attachmentUrl)
  @IsString()
  @IsNotEmpty()
  attachmentKey: string;
}

class ReconcileBankStatementDto {
  @IsString()
  @IsNotEmpty()
  bankStatementId: string;
}

interface ProductMatch {
  productId: string;
  productName: string;
  sku: string | null;
  confidence: number;
  originalDescription: string;
}

/** Латински букви, изглеждащи като кирилски — фактурите редовно ги смесват */
const LOOKALIKE: Record<string, string> = {
  A: 'А',
  B: 'В',
  C: 'С',
  E: 'Е',
  H: 'Н',
  K: 'К',
  M: 'М',
  O: 'О',
  P: 'Р',
  T: 'Т',
  X: 'Х',
  Y: 'У',
};

/** Правни форми — не носят идентичност и се махат преди сравнение */
const LEGAL_FORMS = new Set([
  'еоод',
  'оод',
  'еад',
  'ад',
  'ет',
  'сд',
  'кд',
  'дззд',
  'ltd',
  'limited',
  'llc',
  'inc',
  'corp',
  'plc',
  'gmbh',
  'ug',
  'sarl',
  'sas',
  'bv',
  'nv',
  'spa',
  'srl',
  'doo',
  'kft',
  'sro',
  'co',
]);

const digitsOf = (value?: string | null): string =>
  (value || '').replace(/\D/g, '');

const normalizeVat = (value?: string | null): string =>
  (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Латинските двойници стават кирилица, за да съвпаднат двата изписа */
const foldLookalikes = (token: string): string =>
  token
    .toUpperCase()
    .replace(/[A-Z]/g, (ch) => LOOKALIKE[ch] || ch)
    .toLowerCase();

const normalizeCompanyName = (value?: string | null): string =>
  (value || '')
    .toLowerCase()
    // кавички, тирета, точки и пр. стават граници между думите
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(
      (token) =>
        token &&
        // и „Ltd", и кирилско „ЕООД", изписано с латински букви
        !LEGAL_FORMS.has(token) &&
        !LEGAL_FORMS.has(foldLookalikes(token)),
    )
    .map(foldLookalikes)
    .join(' ');

interface SuggestedSupplier {
  id: string;
  name: string;
  /** По какво е разпознат — по име не е сигурно и се иска потвърждение */
  matchedBy: 'eik' | 'vat' | 'name';
  /** Повече от един кандидат (напр. дублирани записи с един ЕИК) */
  ambiguous: boolean;
}

/** Данните на доставчика от фактурата — за формата „нов доставчик" */
interface SupplierDraft {
  name: string;
  eik?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
}

interface ScanResult extends ParsedInvoiceData {
  matchedProducts: ProductMatch[];
  suggestedSupplier?: SuggestedSupplier;
  supplierDraft?: SupplierDraft;
}

@Controller('companies/:companyId/cortana')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class DocumentAIController {
  constructor(
    private documentAIService: DocumentAIService,
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  /**
   * Check if Cortana (Document AI) is enabled
   */
  @Get('status')
  @RequireView('ai', 'invoiceScanning')
  async getStatus(@Param('companyId') companyId: string) {
    return {
      enabled: await this.documentAIService.isEnabledForCompany(companyId),
      name: 'Cortana',
      capabilities: ['invoice_scan', 'text_extraction'],
    };
  }

  /**
   * Scan an invoice and extract data.
   * Rate limited: всяко сканиране е платена Anthropic заявка НА КЛИЕНТА —
   * скриптирано bombing (Postman + валиден токен) не бива да може да му
   * трупа сметка. 5/мин + 60/10мин са предостатъчно за ръчна работа.
   */
  @Post('scan-invoice')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    long: { limit: 60, ttl: 600000 },
  })
  @RequireView('ai', 'invoiceScanning')
  async scanInvoice(
    @Param('companyId') companyId: string,
    @Body() dto: ScanInvoiceDto,
  ): Promise<ScanResult> {
    let parsedData: ParsedInvoiceData;

    if (dto.base64Image) {
      parsedData = await this.documentAIService.parseInvoiceFromBase64(
        companyId,
        dto.base64Image,
        dto.mimeType || 'image/jpeg',
      );
    } else if (dto.imageUrl) {
      parsedData = await this.documentAIService.parseInvoice(
        companyId,
        dto.imageUrl,
      );
    } else {
      throw new Error('Either imageUrl or base64Image is required');
    }

    return this.buildScanResult(companyId, parsedData);
  }

  /**
   * Scan an uploaded invoice file (multipart). Отделен от JSON варианта, за
   * да не вдигаме глобалния body limit — multer си има собствен (15MB).
   */
  @Post('scan-invoice-file')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    long: { limit: 60, ttl: 600000 },
  })
  @RequireView('ai', 'invoiceScanning')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  async scanInvoiceFile(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ScanResult> {
    if (!file) {
      throw new BadRequestException('Липсва файл');
    }
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        'Поддържат се само изображения (JPEG/PNG/WebP/GIF) и PDF файлове',
      );
    }

    const parsedData = await this.documentAIService.parseInvoiceFromBase64(
      companyId,
      file.buffer.toString('base64'),
      file.mimetype,
    );
    return this.buildScanResult(companyId, parsedData);
  }

  /**
   * Прочита вече прикачения към разхода документ (R2 ключ) и извлича данните
   * за формата — операторът качва файла веднъж, после натиска „Попълни с
   * Cortana". Нищо не се записва; резултатът само предпопълва формата.
   */
  @Post('scan-expense-attachment')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    long: { limit: 60, ttl: 600000 },
  })
  @RequireView('ai', 'invoiceScanning')
  async scanExpenseAttachment(
    @Param('companyId') companyId: string,
    @Body() dto: ScanExpenseAttachmentDto,
  ): Promise<ScanResult> {
    const key = dto.attachmentKey;
    // Ключовете са `invoices/<companyId>/<uuid>.<ext>` — чужд ключ не минава.
    // Стари записи с пълен URL не се поддържат (документът трябва да е в R2).
    if (!key.startsWith(`invoices/${companyId}/`) || key.includes('..')) {
      throw new BadRequestException(
        'Документът не може да бъде прочетен. Прикачете го отново.',
      );
    }

    let contentType: string;
    let content: Buffer;
    try {
      const file = await this.uploads.getFile(key);
      contentType = file.contentType;
      const chunks: Buffer[] = [];
      for await (const chunk of file.stream) {
        chunks.push(chunk as Buffer);
      }
      content = Buffer.concat(chunks);
    } catch {
      throw new BadRequestException('Прикаченият документ не е намерен');
    }

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    if (!allowed.includes(contentType)) {
      throw new BadRequestException(
        'Поддържат се само изображения (JPEG/PNG/WebP/GIF) и PDF файлове',
      );
    }
    if (content.length > 15 * 1024 * 1024) {
      throw new BadRequestException('Файлът е твърде голям за разчитане');
    }

    const parsedData = await this.documentAIService.parseInvoiceFromBase64(
      companyId,
      content.toString('base64'),
      contentType,
    );
    return this.buildScanResult(companyId, parsedData);
  }

  /**
   * Сканиране на ДОСТАВНА фактура (tool use): AI-ят сам търси в продуктите и
   * доставчиците на компанията и връща per ред мачнат продукт или
   * предложение за нов. Същите лимити като другите сканирания.
   */
  @Post('scan-delivery-file')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 5, ttl: 60000 },
    long: { limit: 60, ttl: 600000 },
  })
  @RequireView('ai', 'invoiceScanning')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }),
  )
  async scanDeliveryFile(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DeliveryScanResult> {
    if (!file) {
      throw new BadRequestException('Липсва файл');
    }
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        'Поддържат се само изображения (JPEG/PNG/WebP/GIF) и PDF файлове',
      );
    }

    return this.documentAIService.parseDeliveryInvoice(
      companyId,
      file.buffer.toString('base64'),
      file.mimetype,
    );
  }

  /**
   * Съгласуване на банково извлечение: Cortana чете качения PDF и мачва
   * редовете срещу поръчки/фактури/разходи НА КОМПАНИЯТА. По-тежка операция
   * (много tool ходове) → по-строг лимит.
   */
  @Post('reconcile-bank-statement')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({
    short: { limit: 3, ttl: 60000 },
    long: { limit: 20, ttl: 600000 },
  })
  @RequireView('ai', 'invoiceScanning')
  async reconcileBankStatement(
    @Param('companyId') companyId: string,
    @Body() dto: ReconcileBankStatementDto,
  ): Promise<{ jobId: string }> {
    if (!dto.bankStatementId) {
      throw new BadRequestException('Липсва банково извлечение');
    }
    // Извлечението трябва да е НА ТАЗИ компания — никакъв достъп до чужди
    const statement = await this.prisma.bankStatement.findFirst({
      where: { id: dto.bankStatementId, companyId },
    });
    if (!statement) {
      throw new BadRequestException('Банковото извлечение не е намерено');
    }

    // fileUrl пази R2 ключ; стари записи може да носят пълен URL
    let content: Buffer;
    if (/^https?:\/\//i.test(statement.fileUrl)) {
      const res = await fetch(statement.fileUrl);
      if (!res.ok) {
        throw new BadRequestException('Файлът на извлечението не е достъпен');
      }
      content = Buffer.from(await res.arrayBuffer());
    } else {
      const { stream } = await this.uploads.getFile(statement.fileUrl);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      content = Buffer.concat(chunks);
    }

    // Стартираме задачата и връщаме веднага — резултатът се взима с GET
    // по jobId (дългата AI работа не бива да държи HTTP заявка отворена)
    const jobId = this.documentAIService.startReconcileJob(
      companyId,
      content.toString('base64'),
    );
    return { jobId };
  }

  /** Статус/резултат на съгласуване — само за компанията, която го е пуснала */
  @Get('reconcile-jobs/:jobId')
  @RequireView('ai', 'invoiceScanning')
  getReconcileJob(
    @Param('companyId') companyId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.documentAIService.getReconcileJob(companyId, jobId);
  }

  // Общата втора половина на сканирането: мачване на продукти и доставчик
  // от базата на компанията към извлечените от AI данни.
  private async buildScanResult(
    companyId: string,
    parsedData: ParsedInvoiceData,
  ): Promise<ScanResult> {
    // Try to match products from line items
    const matchedProducts: ProductMatch[] = [];

    if (parsedData.lineItems.length > 0) {
      const companyProducts = await this.prisma.product.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, sku: true },
      });

      for (const lineItem of parsedData.lineItems) {
        const match = this.findBestProductMatch(
          lineItem.description,
          lineItem.productCode,
          companyProducts,
        );

        if (match) {
          matchedProducts.push({
            ...match,
            originalDescription: lineItem.description,
          });
        }
      }
    }

    const suggestedSupplier = await this.findSupplierMatch(
      companyId,
      parsedData,
    );

    return {
      ...parsedData,
      matchedProducts,
      suggestedSupplier,
      supplierDraft: parsedData.supplierName
        ? {
            name: parsedData.supplierName,
            eik: parsedData.supplierEik,
            vatNumber: parsedData.supplierVatNumber,
            address: parsedData.supplierAddress,
            city: parsedData.supplierCity,
            phone: parsedData.supplierPhone,
            email: parsedData.supplierEmail,
            bankName: parsedData.supplierBankName,
            iban: parsedData.supplierIban,
            bic: parsedData.supplierBic,
          }
        : undefined,
    };
  }

  /**
   * Търсене на доставчика от фактурата в записите на компанията, подредено по
   * надеждност: ЕИК → ДДС номер → име. Само първите две са идентичност и
   * фронтендът ги избира автоматично; по име се иска потвърждение.
   *
   * Сравнява се върху нормализиран текст, защото фактурите пишат имената
   * различно от базата: „ВИК-Бургас ЕООД" ↔ „ВИК Бургас", кавички, двойни
   * интервали, и латински букви, вмъкнати в кирилско име (Е/E, О/O, А/A…).
   */
  private async findSupplierMatch(
    companyId: string,
    parsed: ParsedInvoiceData,
  ): Promise<SuggestedSupplier | undefined> {
    if (
      !parsed.supplierName &&
      !parsed.supplierEik &&
      !parsed.supplierVatNumber
    ) {
      return undefined;
    }

    const suppliers = await this.prisma.supplier.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, eik: true, vatNumber: true },
    });
    if (suppliers.length === 0) return undefined;

    const pick = (
      matches: typeof suppliers,
      matchedBy: SuggestedSupplier['matchedBy'],
    ): SuggestedSupplier => ({
      id: matches[0].id,
      name: matches[0].name,
      matchedBy,
      ambiguous: matches.length > 1,
    });

    // 1. ЕИК — и срещу eik, и срещу ДДС номера без кода на държавата
    const eik = digitsOf(parsed.supplierEik || parsed.supplierVatNumber);
    if (eik.length === 9 || eik.length === 13) {
      const byEik = suppliers.filter(
        (s) => digitsOf(s.eik) === eik || digitsOf(s.vatNumber) === eik,
      );
      if (byEik.length > 0) return pick(byEik, 'eik');
    }

    // 2. ДДС номер (главни букви, без интервали и тирета)
    const vat = normalizeVat(parsed.supplierVatNumber);
    if (vat) {
      const byVat = suppliers.filter((s) => normalizeVat(s.vatNumber) === vat);
      if (byVat.length > 0) return pick(byVat, 'vat');
    }

    // 3. Име — точно съвпадение на нормализираното, после подниз в двете посоки
    const name = normalizeCompanyName(parsed.supplierName);
    if (name.length >= 3) {
      const normalized = suppliers.map((s) => ({
        supplier: s,
        name: normalizeCompanyName(s.name),
      }));
      const exact = normalized.filter((s) => s.name === name);
      if (exact.length > 0) {
        return pick(
          exact.map((s) => s.supplier),
          'name',
        );
      }
      const partial = normalized.filter(
        (s) =>
          s.name.length >= 3 &&
          (s.name.includes(name) || name.includes(s.name)),
      );
      if (partial.length > 0) {
        return pick(
          partial.map((s) => s.supplier),
          'name',
        );
      }
    }

    return undefined;
  }

  private findBestProductMatch(
    description: string,
    productCode: string | undefined,
    products: { id: string; name: string; sku: string | null }[],
  ): Omit<ProductMatch, 'originalDescription'> | null {
    const normalizedDesc = description.toLowerCase().trim();

    // First try exact SKU match
    if (productCode) {
      const skuMatch = products.find(
        (p) => p.sku?.toLowerCase() === productCode.toLowerCase(),
      );
      if (skuMatch) {
        return {
          productId: skuMatch.id,
          productName: skuMatch.name,
          sku: skuMatch.sku,
          confidence: 1.0,
        };
      }
    }

    // Try fuzzy name matching
    let bestMatch: Omit<ProductMatch, 'originalDescription'> | null = null;
    let bestScore = 0;

    for (const product of products) {
      const productName = product.name.toLowerCase();

      // Calculate similarity score
      const score = this.calculateSimilarity(normalizedDesc, productName);

      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          confidence: score,
        };
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/).filter((w) => w.length > 2);
    const words2 = str2.split(/\s+/).filter((w) => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(words1.length, words2.length);
  }
}
