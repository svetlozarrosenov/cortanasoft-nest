import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WordPressApiService } from './wordpress-api.service';
import { WordPressRequestOptions } from './interfaces';
import { SaveWordPressIntegrationDto } from './dto';

const PROVIDER = 'woocommerce';

interface IntegrationJwtPayload {
  companyId: string;
  provider: string;
}

@Injectable()
export class WordPressService {
  private readonly logger = new Logger(WordPressService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private wpApi: WordPressApiService,
  ) {}

  // ==================== JWT Key ====================

  /**
   * Генерира JWT ключ за WordPress интеграция.
   * Payload: { companyId, provider: 'woocommerce' }
   * Без expiration — валиден докато интеграцията е active.
   */
  generateApiKey(companyId: string): string {
    const payload: IntegrationJwtPayload = { companyId, provider: PROVIDER };
    return this.jwtService.sign(payload);
  }

  /**
   * Верифицира JWT ключ и връща companyId.
   * Не прави DB lookup — само криптографска проверка.
   */
  verifyApiKey(token: string): IntegrationJwtPayload | null {
    try {
      return this.jwtService.verify<IntegrationJwtPayload>(token);
    } catch {
      return null;
    }
  }

  // ==================== Интеграция (CRUD) ====================

  async getIntegration(companyId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    if (!integration) return null;

    return {
      ...integration,
      apiKey: integration.apiKey ? integration.apiKey : null,
    };
  }

  async saveIntegration(companyId: string, dto: SaveWordPressIntegrationDto) {
    const domain = dto.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const mode = dto.mode || 'live';

    const existing = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    const settings: Prisma.InputJsonValue = { mode: mode as string };

    if (existing) {
      return this.prisma.integration.update({
        where: { id: existing.id },
        data: {
          domain,
          settings,
          isActive: dto.isActive ?? existing.isActive,
        },
      });
    }

    // Нова интеграция — генерираме JWT ключ
    const apiKey = this.generateApiKey(companyId);

    return this.prisma.integration.create({
      data: {
        provider: PROVIDER,
        domain,
        apiKey,
        settings: { mode },
        isActive: dto.isActive ?? true,
        companyId,
      },
    });
  }

  async regenerateApiKey(companyId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    if (!integration) {
      throw new NotFoundException('WordPress интеграцията не е намерена');
    }

    const apiKey = this.generateApiKey(companyId);

    const updated = await this.prisma.integration.update({
      where: { id: integration.id },
      data: { apiKey },
    });

    return updated;
  }

  async deleteIntegration(companyId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    if (!integration) {
      throw new NotFoundException('WordPress интеграцията не е намерена');
    }

    return this.prisma.integration.delete({ where: { id: integration.id } });
  }

  async testConnection(companyId: string) {
    const options = await this.getApiOptions(companyId);
    const ok = await this.wpApi.testConnection(options);
    return { success: ok };
  }

  // ==================== Outbound product sync ====================

  /**
   * Синхронизира продукт към WordPress при промяна.
   * Fire-and-forget — грешките не спират основния flow.
   */
  async syncProduct(companyId: string, productId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });
    if (!integration?.apiKey || !integration?.domain || !integration.isActive) {
      return;
    }

    const settings = integration.settings as Record<string, unknown> | null;
    const mode = (settings?.mode as 'test' | 'live') || 'live';

    const options: WordPressRequestOptions = {
      domain: integration.domain,
      apiKey: integration.apiKey,
      mode,
    };

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        sku: true,
        name: true,
        description: true,
        salePrice: true,
        weight: true,
        dimensionsL: true,
        dimensionsW: true,
        dimensionsH: true,
        trackInventory: true,
        isActive: true,
        inventoryBatches: {
          where: { quantity: { gt: 0 } },
          select: { quantity: true },
        },
      },
    });

    if (!product || !product.sku) return;

    const stockQuantity = product.inventoryBatches.reduce(
      (sum, b) => sum + Number(b.quantity),
      0,
    );

    const payload: Record<string, unknown> = {
      sku: product.sku,
      name: product.name,
      regular_price: Number(product.salePrice),
      weight: product.weight ? Number(product.weight) : null,
      length: product.dimensionsL ? Number(product.dimensionsL) : null,
      width: product.dimensionsW ? Number(product.dimensionsW) : null,
      height: product.dimensionsH ? Number(product.dimensionsH) : null,
      stock_quantity: stockQuantity,
      stock_status: stockQuantity > 0 ? 'instock' : 'outofstock',
      is_active: product.isActive,
    };

    console.log('crb_payload', payload);
    const ok = await this.wpApi.syncProduct(options, payload);
    if (ok) {
      this.logger.log(
        `Product synced to WordPress: SKU ${product.sku} → ${integration.domain}`,
      );
    }
  }

  // ==================== Helpers ====================

  private async getApiOptions(
    companyId: string,
  ): Promise<WordPressRequestOptions> {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    if (!integration || !integration.apiKey || !integration.domain) {
      throw new BadRequestException(
        'WordPress интеграцията не е конфигурирана. Моля, добавете домейн и API ключ.',
      );
    }

    if (!integration.isActive) {
      throw new BadRequestException('WordPress интеграцията е деактивирана');
    }

    const settings = integration.settings as Record<string, unknown> | null;
    const mode = (settings?.mode as 'test' | 'live') || 'live';

    return {
      domain: integration.domain,
      apiKey: integration.apiKey,
      mode,
    };
  }
}
