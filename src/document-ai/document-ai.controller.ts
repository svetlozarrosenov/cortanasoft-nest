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
  ReconcileResult,
} from './document-ai.service';
import { UploadsService } from '../uploads/uploads.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

class ScanInvoiceDto {
  imageUrl?: string;
  base64Image?: string;
  mimeType?: string;
}

class ReconcileBankStatementDto {
  bankStatementId: string;
}

interface ProductMatch {
  productId: string;
  productName: string;
  sku: string | null;
  confidence: number;
  originalDescription: string;
}

interface ScanResult extends ParsedInvoiceData {
  matchedProducts: ProductMatch[];
  suggestedSupplier?: {
    id: string;
    name: string;
  };
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
      parsedData = await this.documentAIService.parseInvoice(companyId, dto.imageUrl);
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
  ): Promise<ReconcileResult> {
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

    return this.documentAIService.reconcileBankStatement(
      companyId,
      content.toString('base64'),
    );
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

    // Try to find matching supplier
    let suggestedSupplier: { id: string; name: string } | undefined;

    if (parsedData.supplierName || parsedData.supplierVatNumber) {
      const orConditions: Prisma.SupplierWhereInput[] = [];

      if (parsedData.supplierName) {
        orConditions.push({
          name: {
            contains: parsedData.supplierName,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        });
      }
      if (parsedData.supplierVatNumber) {
        orConditions.push({
          vatNumber: parsedData.supplierVatNumber,
        });
      }

      const suppliers = await this.prisma.supplier.findMany({
        where: {
          companyId,
          isActive: true,
          ...(orConditions.length > 0 ? { OR: orConditions } : {}),
        },
        select: { id: true, name: true },
        take: 1,
      });

      if (suppliers.length > 0) {
        suggestedSupplier = suppliers[0];
      }
    }

    return {
      ...parsedData,
      matchedProducts,
      suggestedSupplier,
    };
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
