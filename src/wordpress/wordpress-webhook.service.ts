import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { WordPressService } from './wordpress.service';
import { WooCommerceOrderPayload, WooCommerceOrderItem } from './interfaces';
import { PaymentMethod } from '@prisma/client';

const PROVIDER = 'woocommerce';

@Injectable()
export class WordPressWebhookService {
  private readonly logger = new Logger(WordPressWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private wordPressService: WordPressService,
  ) {}

  /**
   * Верифицира JWT ключ → извлича companyId → проверява дали интеграцията е активна.
   */
  async resolveCompanyByApiKey(
    apiKey: string | undefined,
  ): Promise<string | null> {
    if (!apiKey) return null;

    const payload = this.wordPressService.verifyApiKey(apiKey);
    if (!payload || payload.provider !== PROVIDER) return null;

    // Проверяваме дали интеграцията е активна
    const integration = await this.prisma.integration.findUnique({
      where: {
        companyId_provider: {
          companyId: payload.companyId,
          provider: PROVIDER,
        },
      },
      select: { isActive: true },
    });

    if (!integration?.isActive) return null;

    return payload.companyId;
  }

  /**
   * Обработва order payload от CortanaSoft WP плъгина.
   */
  async processOrderWebhook(
    companyId: string,
    payload: WooCommerceOrderPayload,
  ) {
    const { order, billing, shipping, totals, items } = payload;

    if (!items || items.length === 0) {
      throw new BadRequestException('Поръчката няма продукти');
    }

    // Match/create продукти
    const orderItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
    }[] = [];

    for (const item of items) {
      const productId = await this.matchOrCreateProduct(companyId, item);
      orderItems.push({
        productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    // Customer match/create
    const customerName =
      [billing?.firstName, billing?.lastName].filter(Boolean).join(' ') ||
      'Unknown';

    const customerId = await this.matchOrCreateCustomer(
      companyId,
      billing,
      shipping,
    );

    const shippingAddress =
      [shipping?.address1, shipping?.address2].filter(Boolean).join(', ') ||
      undefined;

    // Payment
    const paymentMethod = this.mapPaymentMethod(order?.paymentMethod);
    const paymentStatus = this.mapPaymentStatus(order?.status);

    // Get first user of company for createdBy
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    if (!userCompany) {
      throw new BadRequestException('Компанията няма потребители');
    }

    const notes = `WooCommerce #${order?.orderNumber || order?.externalId || ''}`;

    const createdOrder = await this.ordersService.create(
      companyId,
      userCompany.userId,
      {
        customerId,
        customerName,
        customerEmail: billing?.email || undefined,
        customerPhone: billing?.phone || undefined,
        shippingAddress,
        shippingCity: shipping?.city || undefined,
        shippingPostalCode: shipping?.postcode || undefined,
        paymentMethod,
        paymentStatus,
        shippingCost: totals?.shippingTotal || 0,
        discount: totals?.discountTotal || 0,
        notes,
        items: orderItems,
        autoConfirm: true,
      },
    );

    this.logger.log(
      `Order created from WooCommerce: ${createdOrder.orderNumber} (WC #${order?.orderNumber || order?.externalId}, company: ${companyId})`,
    );

    return {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
    };
  }

  // ==================== Helpers ====================

  private async matchOrCreateProduct(
    companyId: string,
    item: WooCommerceOrderItem,
  ): Promise<string> {
    // 1. Match по SKU
    if (item.sku) {
      const bySku = await this.prisma.product.findFirst({
        where: { companyId, sku: item.sku, isActive: true },
      });
      if (bySku) return bySku.id;
    }

    // 2. Match по име
    if (item.name) {
      const byName = await this.prisma.product.findFirst({
        where: { companyId, name: item.name, isActive: true },
      });
      if (byName) return byName.id;
    }

    // 3. Auto-create
    const sku =
      item.sku ||
      `WC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const product = await this.prisma.product.create({
      data: {
        sku,
        name: item.name || 'Unknown Product',
        salePrice: item.unitPrice || 0,
        trackInventory: false,
        companyId,
      },
    });

    this.logger.log(
      `Auto-created product "${product.name}" (SKU: ${product.sku}) from WooCommerce order`,
    );

    return product.id;
  }

  private async matchOrCreateCustomer(
    companyId: string,
    billing: WooCommerceOrderPayload['billing'],
    shipping: WooCommerceOrderPayload['shipping'],
  ): Promise<string | undefined> {
    if (!billing?.email) return undefined;

    // 1. Match по email
    const existing = await this.prisma.customer.findFirst({
      where: { companyId, email: billing.email },
      select: { id: true },
    });
    if (existing) return existing.id;

    // 2. Auto-create
    const isCompany = !!billing.company;
    const customer = await this.prisma.customer.create({
      data: {
        type: isCompany ? 'COMPANY' : 'INDIVIDUAL',
        source: 'WEBSITE',
        firstName: billing.firstName || null,
        lastName: billing.lastName || null,
        companyName: isCompany ? billing.company : null,
        email: billing.email,
        phone: billing.phone || null,
        address: [shipping?.address1, shipping?.address2]
          .filter(Boolean)
          .join(', ') || null,
        city: shipping?.city || null,
        postalCode: shipping?.postcode || null,
        companyId,
      },
    });

    this.logger.log(
      `Auto-created customer "${billing.firstName} ${billing.lastName}" (${billing.email}) from WooCommerce order`,
    );

    return customer.id;
  }

  private mapPaymentMethod(method: string | undefined): PaymentMethod {
    if (!method) return PaymentMethod.CARD;

    const map: Record<string, PaymentMethod> = {
      cod: PaymentMethod.COD,
      bacs: PaymentMethod.BANK_TRANSFER,
      cheque: PaymentMethod.BANK_TRANSFER,
      cash: PaymentMethod.CASH,
    };

    return map[method.toLowerCase()] || PaymentMethod.CARD;
  }

  private mapPaymentStatus(
    orderStatus: string | undefined,
  ): 'PENDING' | 'PARTIAL' | 'PAID' {
    if (!orderStatus) return 'PENDING';

    const paidStatuses = ['completed', 'processing'];
    if (paidStatuses.includes(orderStatus)) return 'PAID';

    if (orderStatus === 'on-hold') return 'PARTIAL';

    return 'PENDING';
  }
}
