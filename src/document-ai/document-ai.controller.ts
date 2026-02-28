import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
} from '../common/guards/permissions.guard';
import { DocumentAIService, ParsedInvoiceData } from './document-ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

class ScanInvoiceDto {
  imageUrl?: string;
  base64Image?: string;
  mimeType?: string;
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
  ) {}

  /**
   * Check if Cortana (Document AI) is enabled
   */
  @Get('status')
  @RequireView('ai', 'invoiceScanning')
  getStatus() {
    return {
      enabled: this.documentAIService.isEnabled(),
      name: 'Cortana',
      capabilities: ['invoice_scan', 'text_extraction'],
    };
  }

  /**
   * Scan an invoice and extract data
   */
  @Post('scan-invoice')
  @HttpCode(HttpStatus.OK)
  @RequireView('ai', 'invoiceScanning')
  async scanInvoice(
    @Param('companyId') companyId: string,
    @Body() dto: ScanInvoiceDto,
  ): Promise<ScanResult> {
    let parsedData: ParsedInvoiceData;

    if (dto.base64Image) {
      parsedData = await this.documentAIService.parseInvoiceFromBase64(
        dto.base64Image,
        dto.mimeType || 'image/jpeg',
      );
    } else if (dto.imageUrl) {
      parsedData = await this.documentAIService.parseInvoice(dto.imageUrl);
    } else {
      throw new Error('Either imageUrl or base64Image is required');
    }

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
