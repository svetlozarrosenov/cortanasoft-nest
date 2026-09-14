import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateReceiptNumber,
  recalcReceiptState,
  RECEIPT_INCLUDE,
} from './receipt-helpers';
import {
  UpdateDirectDeliveryDto,
  CreateDirectDeliveryItemDto,
} from './dto/create-direct-delivery.dto';

/**
 * Дропшип (директна доставка): стоката отива от доставчика право при клиента.
 *
 * Модел като в Odoo: при потвърждаване на продажба с директни редове системата
 * САМА създава запис в Склад > Доставки („заявка към доставчик") без доставчик
 * и с предложени цени. Складът го обработва там: доставчик, цени, фактура,
 * плащания, „изпратена", „получена при клиента". Продажбата само показва
 * статуса и линк. Един обект, два входа.
 *
 * Отделен сервиз само с Prisma, за да може OrdersModule да го ползва без
 * цикъл (GoodsReceiptsModule → WordPress/CloudCart → OrdersModule).
 */
@Injectable()
export class DirectDeliveriesService {
  private readonly logger = new Logger(DirectDeliveriesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Предложена покупна цена и доставчик за продукт: от последната (неанулирана)
   * доставка на този продукт във фирмата. Само подсказка — нищо не се пази по
   * продукта; операторът винаги може да смени и двете.
   */
  private async lastPurchaseInfo(companyId: string, productIds: string[]) {
    const map = new Map<string, { unitPrice: number; supplierId: string | null }>();
    if (productIds.length === 0) return map;
    const rows = await this.prisma.goodsReceiptItem.findMany({
      where: {
        productId: { in: productIds },
        goodsReceipt: { companyId, status: { not: 'CANCELLED' } },
      },
      select: {
        productId: true,
        unitPrice: true,
        exchangeRate: true,
        goodsReceipt: { select: { supplierId: true, receiptDate: true } },
      },
      orderBy: { goodsReceipt: { receiptDate: 'desc' } },
    });
    for (const r of rows) {
      if (map.has(r.productId)) continue;
      map.set(r.productId, {
        unitPrice:
          Math.round(Number(r.unitPrice) * Number(r.exchangeRate || 1) * 100) /
          100,
        supplierId: r.goodsReceipt.supplierId,
      });
    }
    return map;
  }

  /** Директните редове на продажбата, събрани по продукт. */
  private async directLinesOfOrder(companyId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, companyId },
      select: {
        id: true,
        status: true,
        items: {
          where: { directDelivery: true },
          select: {
            productId: true,
            quantity: true,
            product: { select: { purchasePrice: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Поръчката не е намерена');
    const wanted = new Map<string, { quantity: number; purchasePrice: number }>();
    for (const it of order.items) {
      const cur = wanted.get(it.productId);
      wanted.set(it.productId, {
        quantity: (cur?.quantity ?? 0) + Number(it.quantity),
        purchasePrice: Number(it.product?.purchasePrice ?? 0),
      });
    }
    return { order, wanted };
  }

  /**
   * Идемпотентно: при потвърждаване/редакция на продажба с директни редове.
   * - няма активна заявка → създава една „чака доставчик" с всички редове;
   * - има неизпратена заявка → синхронизира редовете ѝ с продажбата
   *   (количествата, покрити от вече изпратени/получени заявки, се приспадат);
   * - всичко е изпратено → не пипа нищо (UI показва разминаването).
   * Връща активните заявки или null, ако продажбата няма директни редове.
   */
  async ensureForOrder(companyId: string, orderId: string, userId?: string) {
    const { order, wanted } = await this.directLinesOfOrder(companyId, orderId);
    if (wanted.size === 0) return null;
    if (['DRAFT', 'PENDING', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(
        'Заявка към доставчик се създава само за потвърдена продажба',
      );
    }

    const active = await this.prisma.goodsReceipt.findMany({
      where: { orderId, companyId, directDelivery: true, status: { not: 'CANCELLED' } },
      include: { items: { select: { id: true, productId: true, quantity: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Компанията не е намерена');
    const defaultVat = company.vatNumber ? 20 : 0;
    const productIds = [...wanted.keys()];
    const suggested = await this.lastPurchaseInfo(companyId, productIds);
    const priceFor = (productId: string) =>
      suggested.get(productId)?.unitPrice ??
      wanted.get(productId)?.purchasePrice ??
      0;

    if (active.length === 0) {
      // Доставчик само ако всички продукти сочат към един и същ от последните
      // доставки — иначе остава празен и операторът избира.
      const supplierIds = new Set(
        productIds.map((id) => suggested.get(id)?.supplierId ?? null),
      );
      const supplierId =
        supplierIds.size === 1 && !supplierIds.has(null)
          ? [...supplierIds][0]
          : null;
      const created = await this.prisma.$transaction(async (tx) => {
        const receiptNumber = await generateReceiptNumber(tx, companyId);
        const receipt = await tx.goodsReceipt.create({
          data: {
            receiptNumber,
            companyId,
            directDelivery: true,
            orderId,
            supplierId,
            createdById: userId,
            currencyId: company.currencyId,
            exchangeRate: 1,
            receiptDate: new Date(),
            items: {
              create: productIds.map((productId) => ({
                productId,
                quantity: wanted.get(productId)!.quantity,
                unitPrice: priceFor(productId),
                vatRate: defaultVat,
                currencyId: company.currencyId,
                exchangeRate: 1,
              })),
            },
          },
        });
        await recalcReceiptState(tx, receipt.id);
        return tx.goodsReceipt.findUnique({ where: { id: receipt.id }, include: RECEIPT_INCLUDE });
      });
      return [created];
    }

    // Синхронизация: приспадаме покритото от изпратени/получени заявки
    const locked = active.filter((r) => r.sentToSupplierAt || r.status === 'DELIVERED');
    const editable = active.filter((r) => !r.sentToSupplierAt && r.status === 'EXPECTED');
    const covered = new Map<string, number>();
    for (const r of locked)
      for (const it of r.items)
        covered.set(it.productId, (covered.get(it.productId) ?? 0) + Number(it.quantity));

    if (editable.length > 0) {
      const target = editable[0];
      // Ако има няколко неизпратени (след разделяне), пипаме само първата, а
      // количествата в останалите се броят за покрити.
      for (const r of editable.slice(1))
        for (const it of r.items)
          covered.set(it.productId, (covered.get(it.productId) ?? 0) + Number(it.quantity));

      await this.prisma.$transaction(async (tx) => {
        const seen = new Set<string>();
        for (const [productId, w] of wanted) {
          const remaining = Math.max(0, w.quantity - (covered.get(productId) ?? 0));
          const existing = target.items.find((it) => it.productId === productId);
          seen.add(productId);
          if (remaining <= 0) {
            if (existing) await tx.goodsReceiptItem.delete({ where: { id: existing.id } });
            continue;
          }
          if (existing) {
            if (Number(existing.quantity) !== remaining) {
              await tx.goodsReceiptItem.update({ where: { id: existing.id }, data: { quantity: remaining } });
            }
          } else {
            await tx.goodsReceiptItem.create({
              data: {
                goodsReceiptId: target.id,
                productId,
                quantity: remaining,
                unitPrice: priceFor(productId),
                vatRate: defaultVat,
                currencyId: company.currencyId,
                exchangeRate: 1,
              },
            });
          }
        }
        // Продукти, които вече не са директни редове на продажбата
        for (const it of target.items) {
          if (!seen.has(it.productId)) await tx.goodsReceiptItem.delete({ where: { id: it.id } });
        }
        await recalcReceiptState(tx, target.id);
      });
    }

    return this.prisma.goodsReceipt.findMany({
      where: { orderId, companyId, directDelivery: true, status: { not: 'CANCELLED' } },
      include: RECEIPT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** При анулиране на продажбата: неизпратените заявки се анулират; изпратените остават (складът решава). */
  async cancelUnsentForOrder(companyId: string, orderId: string) {
    const unsent = await this.prisma.goodsReceipt.findMany({
      where: { orderId, companyId, directDelivery: true, status: 'EXPECTED', sentToSupplierAt: null },
      select: { id: true },
    });
    if (unsent.length === 0) return 0;
    const ids = unsent.map((r) => r.id);
    await this.prisma.$transaction([
      this.prisma.goodsReceipt.updateMany({ where: { id: { in: ids } }, data: { status: 'CANCELLED' } }),
      this.prisma.expense.updateMany({ where: { goodsReceiptId: { in: ids } }, data: { status: 'CANCELLED' } }),
    ]);
    return ids.length;
  }

  private async findDirect(companyId: string, id: string) {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id, companyId, directDelivery: true },
      include: RECEIPT_INCLUDE,
    });
    if (!receipt) throw new NotFoundException('Дропшип заявката не е намерена');
    return receipt;
  }

  /** Редакция от Склад > Доставки. */
  async update(companyId: string, id: string, dto: UpdateDirectDeliveryDto) {
    const receipt = await this.findDirect(companyId, id);
    if (receipt.status === 'CANCELLED') {
      throw new BadRequestException('Анулирана заявка не може да се редактира');
    }
    const structural =
      dto.items !== undefined || dto.supplierId !== undefined || dto.receiptDate !== undefined;
    if (receipt.status === 'DELIVERED' && structural) {
      throw new BadRequestException(
        'Получена доставка: могат да се променят само фактурата и бележките',
      );
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, companyId } });
      if (!supplier) throw new NotFoundException('Доставчикът не е намерен');
    }
    let items: CreateDirectDeliveryItemDto[] | undefined;
    if (dto.items) {
      if (!receipt.orderId) throw new BadRequestException('Заявката няма продажба');
      const { wanted } = await this.directLinesOfOrder(companyId, receipt.orderId);
      items = dto.items.filter((it) => it.quantity > 0);
      if (items.length === 0) throw new BadRequestException('Заявката трябва да има поне един ред');
      if (items.some((it) => !wanted.has(it.productId))) {
        throw new BadRequestException(
          'Заявката може да съдържа само продукти от директните редове на продажбата',
        );
      }
    }
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const defaultVat = company?.vatNumber ? 20 : 0;

    return this.prisma.$transaction(async (tx) => {
      await tx.goodsReceipt.update({
        where: { id },
        data: {
          ...(dto.supplierId !== undefined && { supplierId: dto.supplierId || null }),
          ...(dto.receiptDate && { receiptDate: new Date(dto.receiptDate) }),
          ...(dto.invoiceNumber !== undefined && { invoiceNumber: dto.invoiceNumber || null }),
          ...(dto.invoiceDate !== undefined && {
            invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes || null }),
        },
      });
      if (items) {
        await tx.goodsReceiptItem.deleteMany({ where: { goodsReceiptId: id } });
        await tx.goodsReceiptItem.createMany({
          data: items.map((it) => ({
            goodsReceiptId: id,
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            vatRate: it.vatRate ?? defaultVat,
            currencyId: receipt.currencyId,
            exchangeRate: 1,
          })),
        });
      }
      await recalcReceiptState(tx, id);
      return tx.goodsReceipt.findUnique({ where: { id }, include: RECEIPT_INCLUDE });
    });
  }

  /** Стъпка „изпратена на доставчика" / връщане в „заявка". */
  async setSent(companyId: string, id: string, sent: boolean) {
    const receipt = await this.findDirect(companyId, id);
    if (receipt.status !== 'EXPECTED') {
      throw new BadRequestException('Само очаквана заявка може да се маркира като изпратена');
    }
    if (sent) {
      if (!receipt.supplierId) throw new BadRequestException('Изберете доставчик, преди да изпратите заявката');
      if (!receipt.items || receipt.items.length === 0) throw new BadRequestException('Заявката няма редове');
    }
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: { sentToSupplierAt: sent ? new Date() : null },
      include: RECEIPT_INCLUDE,
    });
  }

  /** Разделяне: избраните продукти отиват в нова заявка към същата продажба (за друг доставчик). */
  async split(companyId: string, id: string, productIds: string[], userId?: string) {
    const receipt = await this.findDirect(companyId, id);
    if (receipt.status !== 'EXPECTED' || receipt.sentToSupplierAt) {
      throw new BadRequestException('Може да се раздели само неизпратена заявка');
    }
    const moving = receipt.items.filter((it) => productIds.includes(it.productId));
    if (moving.length === 0) throw new BadRequestException('Няма избрани редове');
    if (moving.length === receipt.items.length) {
      throw new BadRequestException('Поне един ред трябва да остане в заявката');
    }
    return this.prisma.$transaction(async (tx) => {
      const receiptNumber = await generateReceiptNumber(tx, companyId);
      const created = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          companyId,
          directDelivery: true,
          orderId: receipt.orderId,
          supplierId: null,
          createdById: userId,
          currencyId: receipt.currencyId,
          exchangeRate: 1,
          receiptDate: new Date(),
          items: {
            create: moving.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              vatRate: it.vatRate,
              currencyId: it.currencyId,
              exchangeRate: it.exchangeRate,
            })),
          },
        },
      });
      await tx.goodsReceiptItem.deleteMany({ where: { id: { in: moving.map((it) => it.id) } } });
      await recalcReceiptState(tx, receipt.id);
      await recalcReceiptState(tx, created.id);
      const [original, split] = await Promise.all([
        tx.goodsReceipt.findUnique({ where: { id: receipt.id }, include: RECEIPT_INCLUDE }),
        tx.goodsReceipt.findUnique({ where: { id: created.id }, include: RECEIPT_INCLUDE }),
      ]);
      return { original, split };
    });
  }
}
