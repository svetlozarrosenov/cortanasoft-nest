import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentMethod } from '@prisma/client';
import {
  CloudCartOrderPayload,
  CloudCartOrderProduct,
  CloudCartPayment,
} from './interfaces';

const PROVIDER = 'cloudcart';

@Injectable()
export class CloudCartWebhookService {
  private readonly logger = new Logger(CloudCartWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  /**
   * Намираме компания по CloudCart API ключ.
   * CloudCart изпраща ключа в request headers при webhook.
   * Търсим в Integration таблицата по plain-text apiKey.
   */
  async resolveCompanyByApiKey(apiKey: string | undefined): Promise<string | null> {
    if (!apiKey) return null;

    const integration = await this.prisma.integration.findFirst({
      where: {
        provider: PROVIDER,
        apiKey,
        isActive: true,
      },
      select: { companyId: true },
    });

    return integration?.companyId || null;
  }

  /**
   * Обработва CloudCart order webhook payload.
   * Трансформира данните и създава поръчка в CortanaSoft.
   */
  async processOrderWebhook(companyId: string, payload: CloudCartOrderPayload) {
    const products = payload.products;

    if (!products || products.length === 0) {
      throw new BadRequestException('Поръчката няма продукти');
    }

    // Матчваме/създаваме продукти и подготвяме items
    const orderItems: { productId: string; quantity: number; unitPrice: number }[] = [];
    for (const product of products) {
      const productId = await this.matchOrCreateProduct(companyId, product);
      orderItems.push({
        productId,
        quantity: product.quantity,
        unitPrice: product.order_price ?? product.price,
      });
    }

    // Customer info
    const customerName = [
      payload.billing_address?.first_name || payload.customer_first_name,
      payload.billing_address?.last_name || payload.customer_last_name,
    ]
      .filter(Boolean)
      .join(' ') || 'Unknown';

    // Shipping address
    const shippingAddr = payload.shipping_address;
    const shippingAddress = shippingAddr?.formatted || shippingAddr?.street || undefined;

    // Shipping cost
    const shippingCost = payload.shipping?.provider_amount || 0;

    // Discount total
    const discountTotal = this.calculateDiscountTotal(payload);

    // Payment method
    const paymentMethod = this.mapPaymentMethod(payload.payments);

    // Payment status
    const paymentStatus = this.mapPaymentStatus(payload.payments, payload.status);

    // Get first user of company for createdBy
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    if (!userCompany) {
      throw new BadRequestException('Компанията няма потребители');
    }

    // Notes
    const notes = `CloudCart #${payload.id}`;

    // Create order
    const createdOrder = await this.ordersService.create(
      companyId,
      userCompany.userId,
      {
        customerName,
        customerEmail: payload.customer_email || undefined,
        customerPhone: shippingAddr?.phone || payload.billing_address?.phone || undefined,
        shippingAddress,
        shippingCity: shippingAddr?.city || undefined,
        shippingPostalCode: shippingAddr?.postal_code || undefined,
        paymentMethod,
        paymentStatus,
        shippingCost,
        discount: discountTotal,
        notes,
        items: orderItems,
        autoConfirm: true,
      },
    );

    this.logger.log(
      `Order created from CloudCart: ${createdOrder.orderNumber} (CC #${payload.id}, company: ${companyId})`,
    );

    return {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
    };
  }

  // ==================== Helpers ====================

  private async matchOrCreateProduct(
    companyId: string,
    ccProduct: CloudCartOrderProduct,
  ): Promise<string> {
    // 1. Match по SKU
    if (ccProduct.sku) {
      const bySku = await this.prisma.product.findFirst({
        where: { companyId, sku: ccProduct.sku, isActive: true },
      });
      if (bySku) return bySku.id;
    }

    // 2. Match по име
    if (ccProduct.name) {
      const byName = await this.prisma.product.findFirst({
        where: { companyId, name: ccProduct.name, isActive: true },
      });
      if (byName) return byName.id;
    }

    // 3. Auto-create
    const sku = ccProduct.sku || `CC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const product = await this.prisma.product.create({
      data: {
        sku,
        barcode: ccProduct.barcode || null,
        name: ccProduct.name || 'Unknown Product',
        salePrice: ccProduct.order_price || ccProduct.price || 0,
        trackInventory: ccProduct.tracked === 'yes',
        companyId,
      },
    });

    this.logger.log(
      `Auto-created product "${product.name}" (SKU: ${product.sku}) from CloudCart order`,
    );

    return product.id;
  }

  private mapPaymentMethod(payments: CloudCartPayment[] | undefined): PaymentMethod {
    if (!payments || payments.length === 0) return PaymentMethod.CARD;

    const provider = payments[0].provider?.toLowerCase() || '';

    const map: Record<string, PaymentMethod> = {
      cod: PaymentMethod.COD,
      bank_transfer: PaymentMethod.BANK_TRANSFER,
      bank: PaymentMethod.BANK_TRANSFER,
      cash: PaymentMethod.CASH,
    };

    return map[provider] || PaymentMethod.CARD;
  }

  private mapPaymentStatus(
    payments: CloudCartPayment[] | undefined,
    orderStatus: string,
  ): 'PENDING' | 'PARTIAL' | 'PAID' {
    // Ако поръчката е paid/completed — маркираме като платена
    if (orderStatus === 'paid' || orderStatus === 'complete' || orderStatus === 'completed') {
      return 'PAID';
    }

    // Проверяваме payment status-а
    if (payments && payments.length > 0) {
      const hasCompleted = payments.some((p) => p.status === 'completed');
      if (hasCompleted) return 'PAID';

      const hasHeld = payments.some((p) => p.status === 'held');
      if (hasHeld) return 'PARTIAL';
    }

    return 'PENDING';
  }

  private calculateDiscountTotal(payload: CloudCartOrderPayload): number {
    // Разликата между subtotal на продуктите и order_subtotal
    if (
      payload.price_products_subtotal &&
      payload.order_subtotal &&
      payload.price_products_subtotal > payload.order_subtotal
    ) {
      return payload.price_products_subtotal - payload.order_subtotal;
    }

    return 0;
  }
}
