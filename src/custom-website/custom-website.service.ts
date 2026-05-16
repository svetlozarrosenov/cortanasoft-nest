import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCustomWebsiteDto } from './dto/save-custom-website.dto';

// Provider name we reserve in the Integration / IntegrationWebhook /
// ApiKey rows for the "custom external shop" integration kind. One row
// per (company, provider) — admin manages it as a single tab in the UI.
const PROVIDER = 'custom-website';
const API_KEY_NAME_PREFIX = 'Custom Website';

const PULL_TIMEOUT_MS = 30_000;

// Subset of the persisted shape we expose to the admin UI. Sensitive
// values (the raw API key, the HMAC secret) are NEVER returned — the
// frontend gets `hasApiKey` / `hasSecret` flags instead.
export interface CustomWebsiteIntegrationView {
  isActive: boolean;
  name: string;
  domain: string;
  webhookUrl: string;
  hasApiKey: boolean;
  apiKeyPrefix: string | null;
  hasSecret: boolean;
  lastPull: {
    customers: string | null;
    categories: string | null;
    products: string | null;
    orders: string | null;
  };
  createdAt: string | null;
  updatedAt: string | null;
}

@Injectable()
export class CustomWebsiteService {
  private readonly logger = new Logger(CustomWebsiteService.name);

  constructor(private prisma: PrismaService) {}

  // Read the current state for the admin UI. Returns null when no
  // integration is configured yet — UI shows the empty/onboarding form.
  async get(companyId: string): Promise<CustomWebsiteIntegrationView | null> {
    const [integration, webhook, apiKey] = await Promise.all([
      this.prisma.integration.findUnique({
        where: { companyId_provider: { companyId, provider: PROVIDER } },
      }),
      this.prisma.integrationWebhook.findFirst({
        where: { companyId, provider: PROVIDER },
      }),
      this.prisma.apiKey.findFirst({
        where: { companyId, name: { startsWith: API_KEY_NAME_PREFIX } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!integration) return null;

    const settings = (integration.settings as Record<string, unknown>) || {};
    const lastPull = (settings.lastPull as Record<string, string>) || {};

    return {
      isActive: integration.isActive,
      name: (settings.name as string) || integration.provider,
      domain: integration.domain || '',
      webhookUrl: webhook?.webhookUrl || this.deriveWebhookUrl(integration.domain),
      hasApiKey: Boolean(apiKey),
      apiKeyPrefix: apiKey?.prefix || null,
      hasSecret: Boolean(webhook?.secret),
      lastPull: {
        customers: lastPull.customers || null,
        categories: lastPull.categories || null,
        products: lastPull.products || null,
        orders: lastPull.orders || null,
      },
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };
  }

  // Create or update the integration. We upsert three related rows in a
  // single transaction so the UI never sees a partial state.
  async save(companyId: string, dto: SaveCustomWebsiteDto) {
    const domain = this.normaliseDomain(dto.domain);
    const webhookUrl = this.deriveWebhookUrl(domain);

    const existingWebhook = await this.prisma.integrationWebhook.findFirst({
      where: { companyId, provider: PROVIDER },
    });

    if (!existingWebhook && (!dto.secret || dto.secret.length < 16)) {
      throw new BadRequestException('HMAC secret is required on first save (≥ 16 chars)');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const integration = await tx.integration.upsert({
        where: { companyId_provider: { companyId, provider: PROVIDER } },
        create: {
          companyId,
          provider: PROVIDER,
          domain,
          isActive: dto.isActive ?? true,
          settings: { name: dto.name },
        },
        update: {
          domain,
          isActive: dto.isActive ?? true,
          settings: {
            ...(((existingWebhook ? await this.readIntegrationSettings(companyId) : null)) || {}),
            name: dto.name,
          },
        },
      });

      // Outbound webhook subscription used by WebhookDispatcherService.
      // Default-subscribe to both stock and order events; existing
      // subscriptions get the missing events back-filled idempotently
      // (set union, no removals).
      const DEFAULT_EVENTS = ['stock.changed', 'order.changed'];
      const mergedEvents = existingWebhook
        ? Array.from(new Set([...existingWebhook.events, ...DEFAULT_EVENTS]))
        : DEFAULT_EVENTS;
      const webhookSecret = dto.secret?.trim() || existingWebhook?.secret;
      const webhook = existingWebhook
        ? await tx.integrationWebhook.update({
            where: { id: existingWebhook.id },
            data: {
              webhookUrl,
              ...(dto.secret?.trim() ? { secret: dto.secret.trim() } : {}),
              isActive: dto.isActive ?? true,
              events: mergedEvents,
            },
          })
        : await tx.integrationWebhook.create({
            data: {
              companyId,
              provider: PROVIDER,
              webhookUrl,
              secret: webhookSecret!,
              events: mergedEvents,
              isActive: dto.isActive ?? true,
            },
          });

      // Inbound API key — auto-create on first save if none exists. The
      // shop side stores this key and sends it on every push.
      let apiKey = await tx.apiKey.findFirst({
        where: { companyId, name: { startsWith: API_KEY_NAME_PREFIX } },
        orderBy: { createdAt: 'desc' },
      });
      let rawKey: string | undefined;
      if (!apiKey) {
        rawKey = 'cs_live_' + crypto.randomBytes(20).toString('hex');
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        apiKey = await tx.apiKey.create({
          data: {
            companyId,
            name: `${API_KEY_NAME_PREFIX}: ${dto.name}`,
            keyHash,
            prefix: rawKey.substring(0, 14),
          },
        });
      }

      return { integration, webhook, apiKey, rawKey };
    });

    const view = await this.get(companyId);
    return {
      integration: view,
      // Only present on first save — admin must copy it; we never expose
      // the raw key again.
      newApiKey: result.rawKey || null,
    };
  }

  async remove(companyId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.integrationWebhook.deleteMany({ where: { companyId, provider: PROVIDER } });
      await tx.integration.deleteMany({ where: { companyId, provider: PROVIDER } });
      await tx.apiKey.deleteMany({ where: { companyId, name: { startsWith: API_KEY_NAME_PREFIX } } });
    });
  }

  // Regenerate the API key — useful if it was leaked. Old key stops
  // working immediately (we delete the row), new one is returned ONCE.
  async regenerateApiKey(companyId: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { companyId, name: { startsWith: API_KEY_NAME_PREFIX } },
    });
    if (!existing) {
      throw new NotFoundException('Custom Website integration not configured');
    }

    const rawKey = 'cs_live_' + crypto.randomBytes(20).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await this.prisma.$transaction(async (tx) => {
      await tx.apiKey.delete({ where: { id: existing.id } });
      await tx.apiKey.create({
        data: {
          companyId,
          name: existing.name,
          keyHash,
          prefix: rawKey.substring(0, 14),
        },
      });
    });

    return { rawKey };
  }

  // Pull customers from the shop. The shop endpoint is HMAC-authenticated
  // (signature over `GET <path> <timestamp>` with the shared secret).
  // We upsert each record into the cortana Customer table by email.
  async pullCustomers(companyId: string) {
    const integration = await this.requireIntegration(companyId);
    let imported = 0;
    let updated = 0;
    let page = 1;

    while (true) {
      const data = await this.signedFetch<{
        customers: Array<{
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
          phone?: string | null;
          address?: string | null;
          city?: string | null;
          postalCode?: string | null;
          country?: string | null;
          createdAt: string;
          orderCount?: number;
          source?: 'registered' | 'guest';
        }>;
        pagination: { page: number; hasNextPage: boolean };
      }>(integration, `/api/integrations/cortana/customers?page=${page}&limit=100`);

      for (const c of data.customers) {
        if (!c.email) continue;
        const existing = await this.prisma.customer.findFirst({
          where: { companyId, email: c.email.toLowerCase() },
        });
        // Registered users come back from shop tagged source='registered';
        // anyone with at least one order is a CLIENT (not LEAD). Pure
        // guests with zero matching orders shouldn't reach us since the
        // shop endpoint filters them out.
        const stage = (c.orderCount ?? 0) > 0 || c.source === 'registered' ? 'CLIENT' : 'LEAD';
        if (existing) {
          await this.prisma.customer.update({
            where: { id: existing.id },
            data: {
              firstName: c.firstName || existing.firstName,
              lastName: c.lastName || existing.lastName,
              phone: c.phone || existing.phone,
              address: c.address || existing.address,
              city: c.city || existing.city,
              postalCode: c.postalCode || existing.postalCode,
              // Only ever upgrade LEAD → CLIENT; never demote a manually
              // promoted record.
              stage: existing.stage === 'CLIENT' ? 'CLIENT' : stage,
            },
          });
          updated++;
        } else {
          await this.prisma.customer.create({
            data: {
              companyId,
              firstName: c.firstName || null,
              lastName: c.lastName || null,
              email: c.email.toLowerCase(),
              phone: c.phone || null,
              address: c.address || null,
              city: c.city || null,
              postalCode: c.postalCode || null,
              stage,
              source: 'WEBSITE',
            },
          });
          imported++;
        }
      }

      if (!data.pagination?.hasNextPage) break;
      page++;
      if (page > 1000) break; // safety
    }

    await this.recordLastPull(companyId, 'customers');
    return { imported, updated };
  }

  // Pull product categories from the shop. cortana's ProductCategory has
  // no `slug` field, so we match by `name` (the (companyId, name, parentId)
  // unique constraint makes this safe at the top level).
  async pullCategories(companyId: string) {
    const integration = await this.requireIntegration(companyId);
    const data = await this.signedFetch<{
      categories: Array<{
        id: string;
        slug: string;
        name: string;
        description?: string | null;
      }>;
    }>(integration, '/api/integrations/cortana/categories');

    let imported = 0;
    let updated = 0;
    for (const cat of data.categories) {
      if (!cat.name) continue;
      const existing = await this.prisma.productCategory.findFirst({
        where: { companyId, name: cat.name, parentId: null },
      });
      if (existing) {
        await this.prisma.productCategory.update({
          where: { id: existing.id },
          data: { description: cat.description || existing.description },
        });
        updated++;
      } else {
        await this.prisma.productCategory.create({
          data: {
            companyId,
            name: cat.name,
            description: cat.description || null,
          },
        });
        imported++;
      }
    }

    await this.recordLastPull(companyId, 'categories');
    return { imported, updated };
  }

  // Pull products from the shop. Matches by SKU; creates with default
  // trackInventory=true so subsequent stock.changed webhooks update it.
  async pullProducts(companyId: string) {
    const integration = await this.requireIntegration(companyId);
    let imported = 0;
    let updated = 0;
    let page = 1;

    while (true) {
      const data = await this.signedFetch<{
        products: Array<{
          id: string;
          sku: string;
          name: string;
          price: number;
          stock: number;
        }>;
        pagination: { page: number; hasNextPage: boolean };
      }>(integration, `/api/integrations/cortana/products?page=${page}&limit=50`);

      for (const p of data.products) {
        if (!p.sku || !p.name) continue;
        const existing = await this.prisma.product.findFirst({
          where: { companyId, sku: p.sku },
        });
        if (existing) {
          await this.prisma.product.update({
            where: { id: existing.id },
            data: {
              name: p.name,
              salePrice: p.price,
            },
          });
          updated++;
        } else {
          await this.prisma.product.create({
            data: {
              companyId,
              sku: p.sku,
              name: p.name,
              salePrice: p.price,
              trackInventory: true,
            },
          });
          imported++;
        }
      }

      if (!data.pagination?.hasNextPage) break;
      page++;
      if (page > 1000) break; // safety
    }

    await this.recordLastPull(companyId, 'products');
    return { imported, updated };
  }

  // Pull historical orders from the shop into cortana. Idempotent by
  // orderNumber — re-running just updates the status / payment status
  // of orders that have changed. New orders are created with Customer
  // (matched/created by email) and OrderItems (matched by SKU; items
  // whose SKU we don't know yet are skipped with a log warning so the
  // user can re-pull after pulling products).
  async pullOrders(companyId: string) {
    const integration = await this.requireIntegration(companyId);
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let page = 1;

    while (true) {
      const data = await this.signedFetch<{
        orders: Array<{
          id: string;
          orderNumber: string;
          status: string;
          paymentMethod: string;
          paymentStatus: string;
          customer: { email: string; phone: string; firstName: string; lastName: string };
          shipping: {
            address: string;
            city: string;
            postalCode: string;
            country: string;
            method: string | null;
            econtData: unknown;
          };
          totals: { subtotal: number; shippingCost: number; discount: number; total: number; currency: string };
          items: Array<{ productId: string; sku: string; name: string; quantity: number; unitPrice: number; lineTotal: number }>;
          notes: string | null;
          createdAt: string;
          updatedAt: string;
        }>;
        pagination: { page: number; hasNextPage: boolean };
      }>(integration, `/api/integrations/cortana/orders?page=${page}&limit=50`);

      for (const o of data.orders) {
        const result = await this.upsertImportedOrder(companyId, o);
        if (result === 'created') imported++;
        else if (result === 'updated') updated++;
        else skipped++;
      }

      if (!data.pagination?.hasNextPage) break;
      page++;
      if (page > 1000) break;
    }

    await this.recordLastPull(companyId, 'orders');
    return { imported, updated, skipped };
  }

  // Translate shop's enums to cortana's. Shop has FINANCING + REVOLUT
  // which cortana doesn't model separately — we fold them into the
  // closest analogue and rely on Order.notes for the original method.
  private mapShopPaymentMethod(method: string): 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'COD' {
    switch ((method || '').toUpperCase()) {
      case 'COD': return 'COD';
      case 'CARD': return 'CARD';
      case 'REVOLUT': return 'CARD';
      case 'BANK': return 'BANK_TRANSFER';
      case 'FINANCING': return 'BANK_TRANSFER';
      default: return 'CASH';
    }
  }

  private mapShopOrderStatus(status: string): 'DRAFT' | 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' {
    switch ((status || '').toUpperCase()) {
      case 'PENDING': return 'PENDING';
      case 'PROCESSING': return 'PROCESSING';
      case 'SHIPPED': return 'SHIPPED';
      case 'DELIVERED': return 'DELIVERED';
      case 'CANCELLED':
      case 'REJECTED_BY_BANK': return 'CANCELLED';
      default: return 'PENDING';
    }
  }

  private mapShopPaymentStatus(status: string): 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' {
    switch ((status || '').toUpperCase()) {
      case 'PAID': return 'PAID';
      case 'REFUNDED': return 'REFUNDED';
      // shop's FAILED / CANCELLED have no direct cortana equivalent; we
      // leave the payment status as PENDING and rely on Order.status to
      // signal that the order itself was cancelled.
      default: return 'PENDING';
    }
  }

  // Create or refresh a cortana Order from a single shop payload. Returns
  // 'created' | 'updated' | 'skipped' so the caller can report counts.
  private async upsertImportedOrder(
    companyId: string,
    shopOrder: {
      orderNumber: string;
      status: string;
      paymentMethod: string;
      paymentStatus: string;
      customer: { email: string; phone: string; firstName: string; lastName: string };
      shipping: { address: string; city: string; postalCode: string; country: string; method: string | null };
      totals: { subtotal: number; shippingCost: number; discount: number; total: number };
      items: Array<{ sku: string; name: string; quantity: number; unitPrice: number; lineTotal: number }>;
      notes: string | null;
      createdAt: string;
    },
  ): Promise<'created' | 'updated' | 'skipped'> {
    // Skip if no items at all — broken shop order, nothing useful to import.
    if (!shopOrder.items || shopOrder.items.length === 0) return 'skipped';

    const status = this.mapShopOrderStatus(shopOrder.status);
    const paymentStatus = this.mapShopPaymentStatus(shopOrder.paymentStatus);
    const paymentMethod = this.mapShopPaymentMethod(shopOrder.paymentMethod);

    // Look up or create the Customer record for this email.
    const email = (shopOrder.customer.email || '').toLowerCase();
    let customerId: string | null = null;
    if (email) {
      const existingCustomer = await this.prisma.customer.findFirst({
        where: { companyId, email },
        select: { id: true },
      });
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const created = await this.prisma.customer.create({
          data: {
            companyId,
            firstName: shopOrder.customer.firstName || null,
            lastName: shopOrder.customer.lastName || null,
            email,
            phone: shopOrder.customer.phone || null,
            stage: 'CLIENT',
            source: 'WEBSITE',
            address: shopOrder.shipping.address || null,
            city: shopOrder.shipping.city || null,
            postalCode: shopOrder.shipping.postalCode || null,
          },
        });
        customerId = created.id;
      }
    }

    // Idempotency — if an Order with this number exists, just refresh
    // status/payment fields. We do NOT rewrite OrderItems on update,
    // since the admin may have already assigned inventorySerials.
    const existing = await this.prisma.order.findFirst({
      where: { companyId, orderNumber: shopOrder.orderNumber },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.order.update({
        where: { id: existing.id },
        data: {
          status,
          paymentStatus,
          paymentMethod,
        },
      });
      return 'updated';
    }

    // Build OrderItem rows — skip items whose SKU we can't match yet,
    // so the rest of the order still imports cleanly. The admin can
    // re-pull after pulling products to fix those.
    const skuList = shopOrder.items.map((i) => i.sku).filter(Boolean);
    const products = await this.prisma.product.findMany({
      where: { companyId, sku: { in: skuList } },
      select: { id: true, sku: true, vatRate: true },
    });
    const productBySku = new Map(products.map((p) => [p.sku, p]));

    const itemsData = shopOrder.items
      .map((i) => {
        const product = productBySku.get(i.sku);
        if (!product) return null;
        const vatRate = product.vatRate ?? 20;
        // Shop prices are VAT-inclusive. Back out the net price so
        // cortana's subtotal + vat math reconciles cleanly.
        const vatMultiplier = 1 + Number(vatRate) / 100;
        const unitNet = Number(i.unitPrice) / vatMultiplier;
        const subtotal = unitNet * i.quantity;
        return {
          productId: product.id,
          quantity: i.quantity,
          unitPrice: Number(unitNet.toFixed(2)),
          vatRate,
          discount: 0,
          subtotal: Number(subtotal.toFixed(2)),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (itemsData.length === 0) return 'skipped';

    const subtotalNoVat = itemsData.reduce((sum, r) => sum + Number(r.subtotal), 0);
    const vatAmount = Number((shopOrder.totals.total - subtotalNoVat - Number(shopOrder.totals.shippingCost) + Number(shopOrder.totals.discount)).toFixed(2));

    await this.prisma.order.create({
      data: {
        companyId,
        orderNumber: shopOrder.orderNumber,
        orderDate: new Date(shopOrder.createdAt),
        status,
        customerId,
        customerName: `${shopOrder.customer.firstName || ''} ${shopOrder.customer.lastName || ''}`.trim() || email || 'Unknown',
        customerEmail: email || null,
        customerPhone: shopOrder.customer.phone || null,
        deliveryMethod: shopOrder.shipping.method === 'econt' ? 'econt_office' : (shopOrder.shipping.address ? 'manual' : 'none'),
        shippingAddress: shopOrder.shipping.address || null,
        shippingCity: shopOrder.shipping.city || null,
        shippingPostalCode: shopOrder.shipping.postalCode || null,
        paymentMethod,
        paymentStatus,
        subtotal: Number(subtotalNoVat.toFixed(2)),
        vatAmount: Math.max(0, vatAmount),
        shippingCost: Number(shopOrder.totals.shippingCost) || 0,
        discount: Number(shopOrder.totals.discount) || 0,
        total: Number(shopOrder.totals.total),
        notes: shopOrder.notes,
        items: { create: itemsData },
      },
    });

    return 'created';
  }

  // ----- helpers -----

  private async requireIntegration(companyId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });
    if (!integration || !integration.isActive || !integration.domain) {
      throw new BadRequestException('Custom Website integration is not configured or active');
    }
    const webhook = await this.prisma.integrationWebhook.findFirst({
      where: { companyId, provider: PROVIDER },
    });
    if (!webhook?.secret) {
      throw new BadRequestException('HMAC secret is not configured');
    }
    return { domain: integration.domain, secret: webhook.secret };
  }

  // Build a signed HTTP GET to a shop endpoint. Signature covers method,
  // path and timestamp so replay attacks within the 5-minute window are
  // possible but limited; the shop side enforces the timestamp window.
  private async signedFetch<T>(
    integration: { domain: string; secret: string },
    path: string,
  ): Promise<T> {
    const url = this.joinUrl(integration.domain, path);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // Sign just the path portion (without origin) so dev/prod swaps don't
    // invalidate signatures.
    const sigPayload = `GET ${path} ${timestamp}`;
    const signature = 'sha256=' + crypto
      .createHmac('sha256', integration.secret)
      .update(sigPayload)
      .digest('hex');

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-cortana-signature': signature,
        'x-cortana-timestamp': timestamp,
      },
      signal: AbortSignal.timeout(PULL_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`Shop responded with ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  private async readIntegrationSettings(companyId: string): Promise<Record<string, unknown>> {
    const integration = await this.prisma.integration.findUnique({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
    });
    return (integration?.settings as Record<string, unknown>) || {};
  }

  private async recordLastPull(companyId: string, kind: 'customers' | 'categories' | 'products' | 'orders') {
    const settings = await this.readIntegrationSettings(companyId);
    const lastPull = (settings.lastPull as Record<string, string>) || {};
    lastPull[kind] = new Date().toISOString();
    await this.prisma.integration.update({
      where: { companyId_provider: { companyId, provider: PROVIDER } },
      data: { settings: { ...settings, lastPull } },
    });
  }

  private deriveWebhookUrl(domain: string | null): string {
    if (!domain) return '';
    return this.joinUrl(domain, '/api/integrations/cortana/webhook');
  }

  private normaliseDomain(value: string): string {
    let v = (value || '').trim();
    if (!v) return v;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v.replace(/\/+$/, '');
  }

  private joinUrl(base: string, path: string): string {
    const b = base.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : '/' + path;
    return b + p;
  }
}
