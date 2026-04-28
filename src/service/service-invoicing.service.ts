import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DEFAULT_VAT = 20;

@Injectable()
export class ServiceInvoicingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Издава фактура за сервизна заявка. Inкapсулира parts (без isWarranty) + labor (без isWarranty).
   * Връзва invoiceId обратно на ServiceOrder.
   */
  async issueInvoice(
    companyId: string,
    serviceOrderId: string,
    userId: string | undefined,
    options?: { dueDate?: string; notes?: string },
  ) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, companyId },
      include: {
        customer: true,
        parts: { include: { product: true } },
        labor: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Сервизната заявка не е намерена');
    }

    if (order.invoiceId) {
      throw new BadRequestException('Заявката вече има издадена фактура');
    }

    const billableParts = order.parts.filter((p) => !p.isWarranty);
    const billableLabor = order.labor.filter((l) => !l.isWarranty);

    if (billableParts.length === 0 && billableLabor.length === 0) {
      throw new BadRequestException('Няма платими позиции за фактуриране');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { vatNumber: true, currencyId: true },
    });
    const defaultVatRate = company?.vatNumber ? DEFAULT_VAT : 0;

    const customer = order.customer;
    const customerName =
      customer.companyName ||
      `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
      'Клиент';

    let subtotal = 0;
    let vatAmount = 0;
    const items: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = [];

    for (const p of billableParts) {
      const itemSubtotal = round2(Number(p.quantity) * Number(p.unitPrice));
      const itemVat = round2(itemSubtotal * (defaultVatRate / 100));
      subtotal += itemSubtotal;
      vatAmount += itemVat;
      items.push({
        product: p.productId
          ? { connect: { id: p.productId } }
          : undefined,
        description: p.product?.name || 'Резервна част',
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        vatRate: defaultVatRate,
        discount: 0,
        total: itemSubtotal,
      });
    }

    for (const l of billableLabor) {
      const itemSubtotal = round2(Number(l.totalPrice));
      const itemVat = round2(itemSubtotal * (defaultVatRate / 100));
      subtotal += itemSubtotal;
      vatAmount += itemVat;
      items.push({
        description: `Труд: ${l.description}`,
        quantity: l.hours,
        unitPrice: l.hourlyRate,
        vatRate: defaultVatRate,
        discount: 0,
        total: itemSubtotal,
      });
    }

    const discount = round2(Number(order.discountAmount) || 0);
    const total = round2(Math.max(0, subtotal + vatAmount - discount));

    return this.prisma.$transaction(async (tx) => {
      // Уникален invoice number — count + 1, padded
      const count = await tx.invoice.count({
        where: { companyId, NOT: { invoiceNumber: { startsWith: 'PRO-' } } },
      });
      const invoiceNumber = (count + 1).toString().padStart(10, '0');

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate: options?.dueDate ? new Date(options.dueDate) : null,
          type: 'REGULAR',
          status: 'ISSUED',
          customerId: customer.id,
          customerName,
          customerEik: customer.eik,
          customerVatNumber: customer.vatNumber,
          customerAddress: customer.address,
          customerCity: customer.city,
          customerPostalCode: customer.postalCode,
          subtotal,
          vatAmount,
          discount,
          total,
          notes: options?.notes || `Сервизна заявка ${order.orderNumber}`,
          companyId,
          createdById: userId,
          currencyId: company?.currencyId || undefined,
          items: { create: items },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      await tx.serviceOrder.update({
        where: { id: order.id },
        data: { invoiceId: invoice.id },
      });

      return invoice;
    });
  }
}
