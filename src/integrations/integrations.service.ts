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

    // Match products and build order items. Shop integrations send GROSS
    // prices (the amount the customer pays). cortana stores net unitPrice +
    // vatRate, so back the VAT out before saving — otherwise the order
    // recomputes VAT on top of the gross and inflates the total.
    const orderItems: { productId: string; quantity: number; unitPrice: number; vatRate: number }[] = [];
    const matchedProductIds: string[] = [];
    for (const item of items) {
      const productId = await this.matchOrCreateProduct(companyId, item);
      matchedProductIds.push(productId);
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: matchedProductIds } },
      select: { id: true, vatRate: true },
    });
    const vatByProduct = new Map(
      products.map((p) => [p.id, Number(p.vatRate ?? 0)]),
    );
    items.forEach((item: any, idx: number) => {
      const productId = matchedProductIds[idx];
      const vatRate = vatByProduct.get(productId) ?? 0;
      const gross = Number(item.unitPrice);
      const net = vatRate > 0 ? gross / (1 + vatRate / 100) : gross;
      orderItems.push({
        productId,
        quantity: item.quantity,
        unitPrice: Number(net.toFixed(2)),
        vatRate,
      });
    });

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

    // Match or create a Customer record so orders from the online shop
    // populate the cortana CRM/ERP customer list (otherwise the order
    // would only carry denormalized customer fields and the customer
    // wouldn't appear in /crm/customers or /erp/customers).
    const customerId = await this.matchOrCreateCustomer(companyId, {
      firstName: billing?.firstName,
      lastName: billing?.lastName,
      email: billing?.email,
      phone: billing?.phone,
      address: shippingAddress,
      city: shipping?.city,
      postalCode: shipping?.postcode,
    });

    // Get a user for createdBy (first user of the company)
    const userId = await this.getCompanyUserId(companyId);

    // Map payment method
    const paymentMethod = this.mapPaymentMethod(order?.paymentMethod);

    // Build notes
    const notes = source
      ? `${source} #${order?.orderNumber || order?.externalId || ''}`
      : undefined;

    const createdOrder = await this.ordersService.create(companyId, userId, {
      customerId,
      customerName,
      customerEmail: billing?.email || undefined,
      customerPhone: billing?.phone || undefined,
      // externalId анкорира тази cortana поръчка към същата поръчка в
      // shop-а; ползва се после за двупосочни webhook-и (status sync).
      externalId: order?.externalId || undefined,
      shippingAddress,
      shippingCity: shipping?.city || undefined,
      shippingPostalCode: shipping?.postcode || undefined,
      paymentMethod,
      shippingCost: totals?.shippingTotal || 0,
      discount: totals?.discountTotal || 0,
      notes,
      items: orderItems,
      autoConfirm: true,
    });

    this.logger.log(
      `Order created from ${source || 'integration'}: ${createdOrder.orderNumber} (company: ${companyId})`,
    );

    return {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
    };
  }

  async getStock(companyId: string, skus?: string[]) {
    const where: any = { companyId, isActive: true };
    if (skus && skus.length > 0) {
      where.sku = { in: skus };
    }

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        sku: true,
        name: true,
        trackInventory: true,
        inventoryBatches: {
          where: { quantity: { gt: 0 } },
          select: { quantity: true },
        },
      },
    });

    return products.map((p) => ({
      sku: p.sku,
      name: p.name,
      trackInventory: p.trackInventory,
      stock: p.trackInventory
        ? p.inventoryBatches.reduce((sum, b) => sum + Number(b.quantity), 0)
        : null,
    }));
  }

  // Find an existing CRM customer by email (preferred) or phone, otherwise
  // create one. Buyers from the online shop are individuals who've already
  // placed an order → stage=CLIENT, source=WEBSITE. Returns undefined only
  // if the payload has no contact info at all.
  private async matchOrCreateCustomer(
    companyId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      postalCode?: string;
    },
  ): Promise<string | undefined> {
    const email = data.email?.trim().toLowerCase() || undefined;
    const phone = data.phone?.trim() || undefined;
    if (!email && !phone) return undefined;

    if (email) {
      const byEmail = await this.prisma.customer.findFirst({
        where: { companyId, email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (byEmail) return byEmail.id;
    }

    if (phone) {
      const byPhone = await this.prisma.customer.findFirst({
        where: { companyId, phone },
        select: { id: true },
      });
      if (byPhone) return byPhone.id;
    }

    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        type: 'INDIVIDUAL',
        stage: 'CLIENT',
        source: 'WEBSITE',
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email: email || null,
        phone: phone || null,
        address: data.address || null,
        city: data.city || null,
        postalCode: data.postalCode || null,
      },
      select: { id: true },
    });

    this.logger.log(
      `Auto-created customer "${data.firstName || ''} ${data.lastName || ''}".trim() (${email || phone}) for company ${companyId}`,
    );

    return customer.id;
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
