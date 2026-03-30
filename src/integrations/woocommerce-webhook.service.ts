import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WooCommerceWebhookService {
  private readonly logger = new Logger(WooCommerceWebhookService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Send product update to the company's WooCommerce site.
   * Called after a product is updated in CortanaSoft.
   */
  async syncProductToWooCommerce(companyId: string, productId: string) {
    // Get company with woocommerceDomain
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { woocommerceDomain: true },
    });

    if (!company?.woocommerceDomain) return;

    // Get API key for this company
    const apiKey = await this.getActiveApiKey(companyId);
    if (!apiKey) {
      this.logger.warn(
        `No active API key for company ${companyId}, skipping WooCommerce sync`,
      );
      return;
    }

    // Get product data
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

    if (!product) return;

    // Build payload
    const payload: Record<string, unknown> = {
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      regular_price: Number(product.salePrice),
      weight: product.weight ? Number(product.weight) : null,
      length: product.dimensionsL ? Number(product.dimensionsL) : null,
      width: product.dimensionsW ? Number(product.dimensionsW) : null,
      height: product.dimensionsH ? Number(product.dimensionsH) : null,
      manage_stock: product.trackInventory,
      is_active: product.isActive,
    };

    // Add stock quantity if tracking inventory
    if (product.trackInventory) {
      payload.stock_quantity = product.inventoryBatches.reduce(
        (sum, b) => sum + Number(b.quantity),
        0,
      );
    }

    // Send webhook (fire-and-forget)
    const url = `https://${company.woocommerceDomain}/wp-json/cortanasoft/v1/product`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(
          `WooCommerce product sync failed for SKU ${product.sku}: ${response.status} ${body}`,
        );
      } else {
        this.logger.log(
          `Product synced to WooCommerce: SKU ${product.sku} → ${company.woocommerceDomain}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `WooCommerce webhook failed for ${company.woocommerceDomain}: ${error.message}`,
      );
    }
  }

  /**
   * Get raw (unhashed) API key for outbound requests.
   * We store only hashes, so we use a dedicated "webhook key" approach:
   * The same API key configured in WP settings is what we send back.
   * Since we only store hashes, we need the raw key — stored as prefix + partial.
   *
   * Alternative: use a dedicated webhook secret field on Company.
   * For now, we'll look up the most recently used active API key's prefix
   * and require the full key to be stored.
   *
   * IMPORTANT: Since API keys are hashed, we cannot retrieve the raw key.
   * Instead, we use the company's API key prefix to identify which key to use,
   * but we need the raw key. Solution: store the raw webhook key on the company.
   */
  private async getActiveApiKey(companyId: string): Promise<string | null> {
    // We need the raw API key to send to WP. Since we only store hashes,
    // we use a separate field on the company for the outbound webhook key.
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { woocommerceApiKey: true },
    });
    return company?.woocommerceApiKey || null;
  }
}
