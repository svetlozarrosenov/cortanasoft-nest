import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  async processOrder(companyId: string, payload: any) {
    const { source, order, billing, shipping, totals, items } = payload;

    if (!items || items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // Match products and build order items
    const orderItems: { productId: string; quantity: number; unitPrice: number }[] = [];
    for (const item of items) {
      const productId = await this.matchOrCreateProduct(companyId, item);
      orderItems.push({
        productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    // Build customer name
    const customerName = [billing?.firstName, billing?.lastName]
      .filter(Boolean)
      .join(' ') || 'Unknown';

    // Build shipping address
    const shippingAddress = [
      shipping?.address1,
      shipping?.address2,
    ]
      .filter(Boolean)
      .join(', ') || undefined;

    // Get a user for createdBy (first user of the company)
    const userId = await this.getCompanyUserId(companyId);

    // Map payment method
    const paymentMethod = this.mapPaymentMethod(order?.paymentMethod);

    // Build notes
    const notes = source
      ? `${source} #${order?.orderNumber || order?.externalId || ''}`
      : undefined;

    const createdOrder = await this.ordersService.create(companyId, userId, {
      customerName,
      customerEmail: billing?.email || undefined,
      customerPhone: billing?.phone || undefined,
      shippingAddress,
      shippingCity: shipping?.city || undefined,
      shippingPostalCode: shipping?.postcode || undefined,
      paymentMethod,
      shippingCost: totals?.shippingTotal || 0,
      discount: totals?.discountTotal || 0,
      notes,
      items: orderItems,
    });

    this.logger.log(
      `Order created from ${source || 'integration'}: ${createdOrder.orderNumber} (company: ${companyId})`,
    );

    return {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
    };
  }

  private async matchOrCreateProduct(
    companyId: string,
    item: any,
  ): Promise<string> {
    // 1. Try matching by SKU
    if (item.sku) {
      const bySku = await this.prisma.product.findFirst({
        where: { companyId, sku: item.sku, isActive: true },
      });
      if (bySku) return bySku.id;
    }

    // 2. Try matching by exact name
    const byName = await this.prisma.product.findFirst({
      where: { companyId, name: item.name, isActive: true },
    });
    if (byName) return byName.id;

    // 3. Auto-create product
    const sku = item.sku || `INT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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
      `Auto-created product "${product.name}" (SKU: ${product.sku}) for company ${companyId}`,
    );

    return product.id;
  }

  private async getCompanyUserId(companyId: string): Promise<string> {
    const userCompany = await this.prisma.userCompany.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });

    if (!userCompany) {
      throw new BadRequestException(
        'No users found for this company. Cannot create order.',
      );
    }

    return userCompany.userId;
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
}
