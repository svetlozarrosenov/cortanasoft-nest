import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudCartApiService } from './cloudcart-api.service';
import {
  CloudCartRequestOptions,
  CloudCartCategory,
  CloudCartProduct,
  CloudCartVariant,
} from './interfaces';
import { SaveCloudCartIntegrationDto } from './dto';

const PROVIDER = 'cloudcart';
const MASK_PLACEHOLDER = '••••••••';

@Injectable()
export class CloudCartService {
  private readonly logger = new Logger(CloudCartService.name);

  constructor(
    private prisma: PrismaService,
    private cloudCartApi: CloudCartApiService,
  ) {}

  // ==================== Интеграция (CRUD) ====================

  async getIntegration(companyId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    if (!integration) return null;

    return {
      ...integration,
      apiKey: integration.apiKey ? MASK_PLACEHOLDER : null,
    };
  }

  async saveIntegration(companyId: string, dto: SaveCloudCartIntegrationDto) {
    const domain = dto.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');

    const existing = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    const data: any = {
      domain,
      isActive: dto.isActive ?? true,
    };

    // Записваме API ключа само ако е подаден нов (не е маската)
    if (dto.apiKey && dto.apiKey !== MASK_PLACEHOLDER) {
      data.apiKey = dto.apiKey;
      // Маскирана версия за показване
      const key = dto.apiKey;
      data.apiKeyHint =
        key.length > 8
          ? `${key.slice(0, 4)}...${key.slice(-4)}`
          : '****';
    }

    if (existing) {
      return this.prisma.integration.update({
        where: { id: existing.id },
        data,
      });
    }

    if (!dto.apiKey || dto.apiKey === MASK_PLACEHOLDER) {
      throw new BadRequestException('API ключът е задължителен при създаване на интеграция');
    }

    return this.prisma.integration.create({
      data: {
        ...data,
        provider: PROVIDER,
        companyId,
      },
    });
  }

  async deleteIntegration(companyId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    if (!integration) {
      throw new NotFoundException('CloudCart интеграцията не е намерена');
    }

    return this.prisma.integration.delete({ where: { id: integration.id } });
  }

  async testConnection(companyId: string) {
    const options = await this.getApiOptions(companyId);
    const ok = await this.cloudCartApi.testConnection(options);
    return { success: ok };
  }

  // ==================== Pull категории ====================

  async pullCategories(companyId: string) {
    const options = await this.getApiOptions(companyId);
    const ccCategories = await this.cloudCartApi.getAllCategories(options);

    // Получаваме съществуващите категории за тази компания
    const existingCategories = await this.prisma.productCategory.findMany({
      where: { companyId },
    });
    const existingByName = new Map(existingCategories.map((c) => [c.name, c]));

    // CloudCart категории по ID за resolve на parent
    const ccById = new Map(ccCategories.map((c) => [Number(c.id), c]));

    let created = 0;
    let skipped = 0;

    // Първо създаваме root категориите (без parent), после child-овете
    const sorted = this.sortCategoriesByHierarchy(ccCategories);

    // Карта от CloudCart ID -> CortanaSoft ID (за parent resolve)
    const idMap = new Map<number, string>();

    // Попълваме idMap за вече съществуващи категории
    for (const cc of ccCategories) {
      const existing = existingByName.get(cc.attributes.name);
      if (existing) {
        idMap.set(Number(cc.id), existing.id);
      }
    }

    for (const cc of sorted) {
      const name = cc.attributes.name;

      if (existingByName.has(name)) {
        skipped++;
        continue;
      }

      // Resolve parent
      let parentId: string | null = null;
      if (cc.attributes.parent_id) {
        parentId = idMap.get(cc.attributes.parent_id) || null;
      }

      try {
        const created_ = await this.prisma.productCategory.create({
          data: {
            name,
            description: cc.attributes.description
              ? this.stripHtml(cc.attributes.description)
              : null,
            parentId,
            companyId,
          },
        });
        idMap.set(Number(cc.id), created_.id);
        existingByName.set(name, created_);
        created++;
      } catch (error) {
        this.logger.warn(`Не може да се създаде категория "${name}": ${error.message}`);
        skipped++;
      }
    }

    return { total: ccCategories.length, created, skipped };
  }

  // ==================== Pull продукти ====================

  async pullProducts(companyId: string) {
    const options = await this.getApiOptions(companyId);
    const { products: ccProducts, included } =
      await this.cloudCartApi.getAllProducts(options);

    // Индексираме included по type+id
    const includedMap = new Map<string, any>();
    for (const item of included) {
      includedMap.set(`${item.type}:${item.id}`, item);
    }

    // Получаваме съществуващите продукти и категории
    const existingProducts = await this.prisma.product.findMany({
      where: { companyId },
      select: { id: true, sku: true },
    });
    const existingSkus = new Set(existingProducts.map((p) => p.sku));

    const existingCategories = await this.prisma.productCategory.findMany({
      where: { companyId },
    });
    const categoryByName = new Map(existingCategories.map((c) => [c.name, c.id]));

    // Company за VAT и валута
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { vatNumber: true, currencyId: true },
    });
    const defaultVatRate = company?.vatNumber ? 20 : 0;

    // Намираме първия потребител за createdById
    const firstUser = await this.prisma.userCompany.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const ccProduct of ccProducts) {
      const attrs = ccProduct.attributes;

      // Намираме variant за SKU и цена
      const variant = this.findDefaultVariant(ccProduct, includedMap);
      const sku = variant?.attributes?.sku || `CC-${ccProduct.id}`;

      if (existingSkus.has(sku)) {
        skipped++;
        continue;
      }

      // Resolve категория
      let categoryId: string | null = null;
      if (attrs.category_id) {
        const ccCat = includedMap.get(`categories:${attrs.category_id}`);
        if (ccCat) {
          categoryId = categoryByName.get(ccCat.attributes.name) || null;
        }
      }

      // Цена
      const price = variant?.attributes?.price ?? attrs.price_from ?? 0;

      try {
        await this.prisma.product.create({
          data: {
            sku,
            externalId: ccProduct.id,
            barcode: variant?.attributes?.barcode || null,
            name: attrs.name,
            description: attrs.description
              ? this.stripHtml(attrs.description)
              : null,
            type: 'PRODUCT',
            unit: 'PIECE',
            salePrice: price,
            vatRate: defaultVatRate,
            weight: variant?.attributes?.weight
              ? Number(variant.attributes.weight)
              : null,
            trackInventory: attrs.tracking === 'yes',
            isActive: attrs.active === 'yes' && attrs.draft !== 'yes',
            companyId,
            categoryId,
            createdById: firstUser?.userId || null,
            purchaseCurrencyId: company?.currencyId || null,
            saleCurrencyId: company?.currencyId || null,
          },
        });
        existingSkus.add(sku);
        created++;
      } catch (error) {
        errors.push(`${attrs.name} (${sku}): ${error.message}`);
        skipped++;
      }
    }

    return {
      total: ccProducts.length,
      created,
      skipped,
      errors: errors.slice(0, 20),
    };
  }

  // ==================== Outbound sync ====================

  /**
   * Синхронизира продукт към CloudCart при промяна на цена/данни.
   * Fire-and-forget — грешките не спират основния flow.
   *
   * В CloudCart: цената и SKU живеят на variant-а, не на продукта.
   * price е в центове (2999 = 29.99 лв).
   */
  async syncProductToCloudCart(companyId: string, productId: string) {
    // Проверяваме дали има активна CloudCart интеграция
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    if (!integration?.apiKey || !integration?.domain || !integration.isActive) return;

    const options: CloudCartRequestOptions = {
      domain: integration.domain,
      apiKey: integration.apiKey,
    };

    // Зареждаме продукта
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        sku: true,
        externalId: true,
        name: true,
        salePrice: true,
        isActive: true,
        inventoryBatches: {
          where: { quantity: { gt: 0 } },
          select: { quantity: true },
        },
      },
    });

    if (!product) return;

    let ccProductId: string;
    let included: any[] = [];

    if (product.externalId) {
      // Match по externalId (директно)
      try {
        const res = await this.cloudCartApi.getProduct(options, product.externalId);
        ccProductId = res.data.id;
        included = res.included || [];
      } catch {
        this.logger.log(
          `Product externalId ${product.externalId} not found in CloudCart, skipping sync`,
        );
        return;
      }
    } else if (product.sku) {
      // Fallback — търсим по SKU
      const result = await this.cloudCartApi.findProductBySku(options, product.sku);
      if (!result) {
        this.logger.log(
          `Product SKU ${product.sku} not found in CloudCart, skipping sync`,
        );
        return;
      }
      ccProductId = result.product.id;
      included = result.included;
    } else {
      return;
    }

    try {
      // 1. Update product name и active status
      await this.cloudCartApi.updateProduct(options, ccProductId, {
        name: product.name,
        active: product.isActive ? 'yes' : 'no',
      });

      // 2. Update variant price + quantity
      const variant = included.find(
        (item: any) => item.type === 'variants',
      );

      if (variant) {
        const priceInCents = Math.round(Number(product.salePrice) * 100);
        const stockQuantity = product.inventoryBatches.reduce(
          (sum: number, b: any) => sum + Number(b.quantity),
          0,
        );
        await this.cloudCartApi.updateVariant(options, variant.id, {
          price: priceInCents,
          quantity: stockQuantity,
        });
      }

      this.logger.log(
        `Product synced to CloudCart: SKU ${product.sku} → ${integration.domain}`,
      );
    } catch (error) {
      this.logger.warn(
        `CloudCart product sync failed for SKU ${product.sku}: ${error.message}`,
      );
    }
  }

  // ==================== Helpers ====================

  private async getApiOptions(companyId: string): Promise<CloudCartRequestOptions> {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });

    if (!integration || !integration.apiKey || !integration.domain) {
      throw new BadRequestException(
        'CloudCart интеграцията не е конфигурирана. Моля, добавете домейн и API ключ.',
      );
    }

    if (!integration.isActive) {
      throw new BadRequestException('CloudCart интеграцията е деактивирана');
    }

    return {
      domain: integration.domain,
      apiKey: integration.apiKey,
    };
  }

  private findDefaultVariant(
    product: CloudCartProduct,
    includedMap: Map<string, any>,
  ): CloudCartVariant | null {
    // Търсим default variant по ID
    if (product.attributes.default_variant_id) {
      const v = includedMap.get(
        `variants:${product.attributes.default_variant_id}`,
      );
      if (v) return v;
    }

    // Търсим всички варианти в relationships
    const variantRels = product.relationships?.variant?.data;
    if (Array.isArray(variantRels) && variantRels.length > 0) {
      const first = variantRels[0];
      return includedMap.get(`${first.type}:${first.id}`) || null;
    }
    if (variantRels?.type && variantRels?.id) {
      return includedMap.get(`${variantRels.type}:${variantRels.id}`) || null;
    }

    return null;
  }

  private sortCategoriesByHierarchy(categories: CloudCartCategory[]): CloudCartCategory[] {
    const roots: CloudCartCategory[] = [];
    const children: CloudCartCategory[] = [];

    for (const c of categories) {
      if (!c.attributes.parent_id) {
        roots.push(c);
      } else {
        children.push(c);
      }
    }

    return [...roots, ...children];
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
