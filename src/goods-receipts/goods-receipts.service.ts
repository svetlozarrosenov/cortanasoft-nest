import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WordPressService } from '../wordpress/wordpress.service';
import { CloudCartService } from '../cloudcart/cloudcart.service';
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';
import {
  CreateGoodsReceiptDto,
  CreateDirectDeliveryDto,
  UpdateGoodsReceiptDto,
  QueryGoodsReceiptsDto,
} from './dto';
import { Prisma, GoodsReceiptStatus } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';
import {
  derivePaymentStatus,
  sumPayments,
} from '../payments/payment-status.util';

// Standard include for goods receipt queries
const RECEIPT_INCLUDE = {
  location: true,
  supplier: true,
  currency: true,
  // Продажбата при директна доставка (drop-ship)
  order: { select: { id: true, orderNumber: true, customerName: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  items: {
    include: {
      product: true,
      currency: true,
    },
  },
  expenses: {
    include: {
      supplier: true,
      currency: true,
    },
  },
  payments: {
    include: {
      currency: { select: { id: true, code: true, symbol: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { paidAt: 'desc' as const },
  },
  _count: { select: { items: true } },
};

// Valid delivery-status transitions (payment is tracked separately via the
// payment ledger, mirroring orders).
const VALID_TRANSITIONS: Record<GoodsReceiptStatus, GoodsReceiptStatus[]> = {
  EXPECTED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: [],
};

@Injectable()
export class GoodsReceiptsService {
  private readonly logger = new Logger(GoodsReceiptsService.name);

  constructor(
    private prisma: PrismaService,
    private wordPressService: WordPressService,
    private cloudCartService: CloudCartService,
    private webhookDispatcher: WebhookDispatcherService,
  ) {}

  private async generateReceiptNumber(
    companyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const year = new Date().getFullYear();
    const prefix = `GR-${year}-`;

    const lastReceipt = await client.goodsReceipt.findFirst({
      where: {
        companyId,
        receiptNumber: { startsWith: prefix },
      },
      orderBy: { receiptNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastReceipt) {
      const lastNumber = parseInt(
        lastReceipt.receiptNumber.split('-').pop() || '0',
      );
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  async create(
    companyId: string,
    userId: string,
    dto: Omit<CreateGoodsReceiptDto, 'locationId'> & { locationId?: string },
    // Директна доставка (drop-ship): без локация, вързана към продажба.
    // Задава се само от createDirectDelivery(), не от публичния DTO.
    direct?: { orderId: string },
  ) {
    // Get company for default currency
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(ErrorMessages.goodsReceipts.companyNotFound);
    }

    // Verify location exists and belongs to company (складова доставка)
    if (!direct) {
      const location = dto.locationId
        ? await this.prisma.location.findFirst({
            where: { id: dto.locationId, companyId },
          })
        : null;
      if (!location) {
        throw new NotFoundException(
          ErrorMessages.goodsReceipts.locationNotFound,
        );
      }
    }

    // Verify supplier if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, companyId },
      });
      if (!supplier) {
        throw new NotFoundException(
          ErrorMessages.goodsReceipts.supplierNotFound,
        );
      }
    }

    // Verify all products exist (deduplicate IDs to avoid false mismatch)
    const uniqueProductIds = [
      ...new Set(dto.items.map((item) => item.productId)),
    ];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, companyId },
    });
    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException(
        ErrorMessages.goodsReceipts.productsNotFound,
      );
    }

    // Use company currency as default
    const currencyId = dto.currencyId || company.currencyId;
    const exchangeRate = dto.exchangeRate ?? 1;

    // Prepare data with proper null handling for optional fields
    const createData = {
      notes: dto.notes || undefined,
      invoiceNumber: dto.invoiceNumber || undefined,
      invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
      attachmentUrl: dto.attachmentUrl || undefined,
      currencyId,
      exchangeRate,
      companyId,
      locationId: direct ? undefined : dto.locationId,
      directDelivery: !!direct,
      orderId: direct?.orderId,
      supplierId: dto.supplierId || undefined,
      createdById: userId,
      receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
      items: {
        create: dto.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate ?? (company.vatNumber ? 20 : 0),
          currencyId: item.currencyId || currencyId,
          exchangeRate: item.exchangeRate ?? 1,
        })),
      },
    };

    // Generate receipt number inside transaction to avoid race condition
    return this.prisma.$transaction(async (tx) => {
      const receiptNumber =
        dto.receiptNumber || (await this.generateReceiptNumber(companyId, tx));

      const receipt = await tx.goodsReceipt.create({
        data: { ...createData, receiptNumber },
        include: RECEIPT_INCLUDE,
      });

      // Create expense records if provided
      if (dto.expenses && dto.expenses.length > 0) {
        for (const exp of dto.expenses) {
          const rate = exp.exchangeRate ?? 1;
          const convertedAmount = exp.amount * rate;
          await tx.expense.create({
            data: {
              description: exp.description,
              category: exp.category,
              amount: exp.amount,
              vatAmount: 0,
              totalAmount: convertedAmount,
              currencyId: exp.currencyId || currencyId,
              exchangeRate: rate,
              expenseDate: receipt.receiptDate,
              status: 'PENDING',
              companyId,
              supplierId: dto.supplierId || undefined,
              createdById: userId,
              goodsReceiptId: receipt.id,
            },
          });
        }
      }

      // Store totalAmount (items + expenses) + derive payment status.
      await this.recalcReceiptState(tx, receipt.id);

      return tx.goodsReceipt.findUnique({
        where: { id: receipt.id },
        include: RECEIPT_INCLUDE,
      });
    });
  }

  /**
   * Директна доставка (drop-ship) към продажба: доставчикът праща стоката
   * право при клиента. Разрешени са само продукти от директните редове на
   * поръчката — така документът остава „за тази продажба", а не обща покупка.
   */
  async createDirectDelivery(
    companyId: string,
    userId: string,
    dto: CreateDirectDeliveryDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, companyId },
      select: {
        id: true,
        status: true,
        items: {
          where: { directDelivery: true },
          select: { productId: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Поръчката не е намерена');
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        'Не може да добавите доставка към анулирана поръчка',
      );
    }
    if (order.items.length === 0) {
      throw new BadRequestException(
        'Поръчката няма редове с директна доставка',
      );
    }
    const directProductIds = new Set(order.items.map((it) => it.productId));
    if (dto.items.some((it) => !directProductIds.has(it.productId))) {
      throw new BadRequestException(
        'Доставката може да съдържа само продукти от директните редове на поръчката',
      );
    }

    return this.create(companyId, userId, dto, { orderId: order.id });
  }

  // Смяна на статус на директна доставка — само през това, за да не може
  // erp.directDelivery да пипа складови доставки (те са зад warehouse права).
  async updateDirectDeliveryStatus(
    companyId: string,
    id: string,
    targetStatus: GoodsReceiptStatus,
    deliveredAt?: string,
  ) {
    const receipt = await this.findOne(companyId, id);
    if (!receipt.directDelivery) {
      throw new BadRequestException('Това не е директна доставка');
    }
    return this.updateStatus(companyId, id, targetStatus, [], deliveredAt);
  }

  /**
   * Recompute and persist a goods receipt's totalAmount (in company currency)
   * AND re-derive its payment state from the payment ledger:
   *   totalAmount = Σ items(qty × unitPrice × exchangeRate × (1 + vatRate/100)) + Σ expenses(totalAmount)
   *   paidAmount  = Σ payments.amount (нетно; връщанията са отрицателни)
   *   paymentStatus = derivePaymentStatus() — винаги изчислен
   * Self-contained so it can run inside the receipt create/update transactions.
   */
  private async recalcReceiptState(
    tx: Prisma.TransactionClient,
    receiptId: string,
  ): Promise<void> {
    const items = await tx.goodsReceiptItem.findMany({
      where: { goodsReceiptId: receiptId },
      select: {
        quantity: true,
        unitPrice: true,
        exchangeRate: true,
        vatRate: true,
      },
    });
    const itemsTotal = items.reduce((sum, it) => {
      const base =
        Number(it.quantity) * Number(it.unitPrice) * Number(it.exchangeRate);
      return sum + base + base * (Number(it.vatRate) / 100);
    }, 0);
    const expAgg = await tx.expense.aggregate({
      where: { goodsReceiptId: receiptId },
      _sum: { totalAmount: true },
    });
    const total =
      Math.round((itemsTotal + Number(expAgg._sum.totalAmount || 0)) * 100) /
      100;

    const { paid, hasRefund } = await sumPayments(tx, {
      goodsReceiptId: receiptId,
    });
    const paymentStatus = derivePaymentStatus(paid, total, hasRefund);

    await tx.goodsReceipt.update({
      where: { id: receiptId },
      data: { totalAmount: total, paidAmount: paid, paymentStatus },
    });
  }

  async findAll(companyId: string, query: QueryGoodsReceiptsDto) {
    const {
      search,
      status,
      locationId,
      supplierId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.GoodsReceiptWhereInput = {
      companyId,
      ...(status && { status }),
      ...(locationId && { locationId }),
      ...(supplierId && { supplierId }),
      ...(dateFrom || dateTo
        ? {
            receiptDate: {
              ...(dateFrom && { gte: new Date(dateFrom + 'T00:00:00.000Z') }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { receiptNumber: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where,
        include: {
          location: true,
          supplier: true,
          currency: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { items: true } },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              exchangeRate: true,
              vatRate: true,
            },
          },
          expenses: {
            select: {
              amount: true,
              totalAmount: true,
            },
          },
          // Само последното плащане — за „кога е платена" в списъка
          payments: {
            select: { paidAt: true },
            orderBy: { paidAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    const dataWithTotals = data.map((receipt) => {
      const totalAmount = receipt.items.reduce((sum, item) => {
        const itemTotal =
          Number(item.quantity) *
          Number(item.unitPrice) *
          Number(item.exchangeRate);
        const vatAmount = itemTotal * (Number(item.vatRate) / 100);
        return sum + itemTotal + vatAmount;
      }, 0);
      const totalExpenses = receipt.expenses.reduce(
        (sum, exp) => sum + Number(exp.totalAmount),
        0,
      );
      const totalQuantity = receipt.items.reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      );
      const { items: _items, expenses: _expenses, payments, ...rest } = receipt;
      return {
        ...rest,
        totalAmount: totalAmount + totalExpenses,
        totalExpenses,
        totalQuantity,
        lastPaidAt: payments[0]?.paidAt ?? null,
      };
    });

    return {
      data: dataWithTotals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, id: string) {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: { id, companyId },
      include: RECEIPT_INCLUDE,
    });

    if (!receipt) {
      throw new NotFoundException(ErrorMessages.goodsReceipts.notFound);
    }

    return receipt;
  }

  async update(companyId: string, id: string, dto: UpdateGoodsReceiptDto) {
    const receipt = await this.findOne(companyId, id);

    if (receipt.status !== 'EXPECTED') {
      throw new BadRequestException(
        ErrorMessages.goodsReceipts.canOnlyUpdateExpected,
      );
    }

    // Verify new location if provided
    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, companyId },
      });
      if (!location) {
        throw new NotFoundException(
          ErrorMessages.goodsReceipts.locationNotFound,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // If items are provided, validate products and replace all items
      if (dto.items && dto.items.length > 0) {
        const newItems = dto.items;
        const company = await tx.company.findUnique({
          where: { id: companyId },
        });

        const uniqueProductIds = [
          ...new Set(newItems.map((item) => item.productId)),
        ];
        const products = await tx.product.findMany({
          where: { id: { in: uniqueProductIds }, companyId },
        });
        if (products.length !== uniqueProductIds.length) {
          throw new BadRequestException(
            ErrorMessages.goodsReceipts.productsNotFound,
          );
        }

        const currencyId = dto.currencyId || receipt.currencyId;

        // Delete existing items
        await tx.goodsReceiptItem.deleteMany({
          where: { goodsReceiptId: id },
        });

        // Create new items
        for (const item of newItems) {
          await tx.goodsReceiptItem.create({
            data: {
              goodsReceiptId: id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate ?? (company?.vatNumber ? 20 : 0),
              currencyId: item.currencyId || currencyId,
              exchangeRate: item.exchangeRate ?? 1,
            },
          });
        }
      }

      // If expenses are provided, replace all linked expenses
      if (dto.expenses !== undefined) {
        // Delete old expenses linked to this receipt
        await tx.expense.deleteMany({
          where: { goodsReceiptId: id },
        });

        // Create new expenses
        if (dto.expenses && dto.expenses.length > 0) {
          const receiptCurrencyId = dto.currencyId || receipt.currencyId;
          for (const exp of dto.expenses) {
            const rate = exp.exchangeRate ?? 1;
            const convertedAmount = exp.amount * rate;
            await tx.expense.create({
              data: {
                description: exp.description,
                category: exp.category,
                amount: exp.amount,
                vatAmount: 0,
                totalAmount: convertedAmount,
                currencyId: exp.currencyId || receiptCurrencyId || undefined,
                exchangeRate: rate,
                expenseDate: receipt.receiptDate,
                status: 'PENDING',
                companyId,
                supplierId: dto.supplierId ?? receipt.supplierId ?? undefined,
                goodsReceiptId: id,
              },
            });
          }
        }
      }

      // Update receipt fields
      await tx.goodsReceipt.update({
        where: { id },
        data: {
          ...(dto.receiptDate && { receiptDate: new Date(dto.receiptDate) }),
          ...(dto.locationId && { locationId: dto.locationId }),
          ...(dto.supplierId !== undefined && {
            supplierId: dto.supplierId || null,
          }),
          ...(dto.invoiceNumber !== undefined && {
            invoiceNumber: dto.invoiceNumber,
          }),
          ...(dto.invoiceDate !== undefined && {
            invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.attachmentUrl !== undefined && {
            attachmentUrl: dto.attachmentUrl || null,
          }),
          ...(dto.currencyId && { currencyId: dto.currencyId }),
          ...(dto.exchangeRate !== undefined && {
            exchangeRate: dto.exchangeRate,
          }),
        },
      });

      // Items/expenses may have changed → refresh totalAmount + payment status.
      await this.recalcReceiptState(tx, id);

      return tx.goodsReceipt.findUnique({
        where: { id },
        include: RECEIPT_INCLUDE,
      });
    });
  }

  async updateStatus(
    companyId: string,
    id: string,
    targetStatus: GoodsReceiptStatus,
    itemSerials?: { goodsReceiptItemId: string; serialNumbers: string[] }[],
    deliveredAtOverride?: string,
    itemBatches?: {
      goodsReceiptItemId: string;
      batchNumber?: string;
      expiryDate?: string;
      manufacturingDate?: string;
    }[],
  ) {
    const receipt = await this.findOne(companyId, id);

    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[receipt.status];
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        ErrorMessages.goodsReceipts.invalidStatusTransition,
      );
    }

    const isDelivering =
      receipt.status === 'EXPECTED' && targetStatus === 'DELIVERED';

    const isCancellingDelivered =
      receipt.status === 'DELIVERED' && targetStatus === 'CANCELLED';

    // Директна доставка (drop-ship): стоката не влиза в наш склад — няма
    // партиди/серийни номера; при получаване само записваме покупната цена
    // като себестойност в директните редове на продажбата.
    if (receipt.directDelivery) {
      if (isDelivering && (!receipt.items || receipt.items.length === 0)) {
        throw new BadRequestException(
          ErrorMessages.goodsReceipts.cannotConfirmWithoutItems,
        );
      }
      return this.prisma.$transaction(async (tx) => {
        if ((isDelivering || isCancellingDelivered) && receipt.orderId) {
          for (const item of receipt.items) {
            const unitCost = isDelivering
              ? Math.round(
                  Number(item.unitPrice) * Number(item.exchangeRate || 1) * 100,
                ) / 100
              : null;
            await tx.orderItem.updateMany({
              where: {
                orderId: receipt.orderId,
                productId: item.productId,
                directDelivery: true,
              },
              data: { unitCost },
            });
          }
        }
        if (targetStatus === 'CANCELLED') {
          await tx.expense.updateMany({
            where: { goodsReceiptId: id },
            data: { status: 'CANCELLED' },
          });
        }
        return tx.goodsReceipt.update({
          where: { id },
          data: {
            status: targetStatus,
            ...(isDelivering && {
              deliveredAt: deliveredAtOverride
                ? new Date(deliveredAtOverride)
                : new Date(),
            }),
          },
          include: RECEIPT_INCLUDE,
        });
      });
    }

    // Validate serial numbers if delivering
    if (isDelivering) {
      if (!receipt.items || receipt.items.length === 0) {
        throw new BadRequestException(
          ErrorMessages.goodsReceipts.cannotConfirmWithoutItems,
        );
      }

      const serialsMap = new Map<string, string[]>();
      (itemSerials ?? []).forEach(({ goodsReceiptItemId, serialNumbers }) => {
        serialsMap.set(
          goodsReceiptItemId,
          serialNumbers.filter((s) => s.trim() !== ''),
        );
      });

      // Validate that ALL serial products have complete serial numbers
      for (const item of receipt.items) {
        if (item.product?.type !== 'SERIAL') continue;

        const quantity = Math.round(Number(item.quantity));
        const provided = serialsMap.get(item.id) ?? [];

        if (provided.length < quantity) {
          throw new BadRequestException(
            `Всички серийни номера са задължителни. Продукт "${item.product.name}" изисква ${quantity} серийни номер(а), но са предоставени ${provided.length}.`,
          );
        }
      }
    }

    // Складова доставка винаги има локация (null е само при directDelivery)
    const locationId = receipt.locationId;
    if (!locationId) {
      throw new BadRequestException(
        ErrorMessages.goodsReceipts.locationNotFound,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // === Create inventory when delivering ===
      if (isDelivering) {
        const serialsMap = new Map<string, string[]>();
        (itemSerials ?? []).forEach(({ goodsReceiptItemId, serialNumbers }) => {
          serialsMap.set(
            goodsReceiptItemId,
            serialNumbers.filter((s) => s.trim() !== ''),
          );
        });

        for (const item of receipt.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product || product.type === 'SERVICE') continue;

          if (product.type === 'SERIAL') {
            const provided = serialsMap.get(item.id) ?? [];
            const serialsToCreate = provided.map((s) => s.trim());

            // Check for duplicate serial numbers
            const existing = await tx.inventorySerial.findMany({
              where: {
                companyId,
                productId: item.productId,
                serialNumber: { in: serialsToCreate },
              },
              select: { serialNumber: true },
            });

            if (existing.length > 0) {
              const dupes = existing.map((s) => s.serialNumber).join(', ');
              throw new BadRequestException(
                `Дублирани серийни номера: ${dupes}`,
              );
            }

            for (const serialNumber of serialsToCreate) {
              await tx.inventorySerial.create({
                data: {
                  serialNumber,
                  status: 'IN_STOCK',
                  unitCost: item.unitPrice,
                  companyId,
                  productId: item.productId,
                  locationId,
                  goodsReceiptItemId: item.id,
                },
              });
            }
          } else {
            // PRODUCT, BATCH — create InventoryBatch
            const info = (itemBatches ?? []).find(
              (b) => b.goodsReceiptItemId === item.id,
            );
            const batchNumber =
              info?.batchNumber?.trim() ||
              `${receipt.receiptNumber}-${item.id.slice(-4)}`;

            const manufacturingDate = info?.manufacturingDate
              ? new Date(info.manufacturingDate)
              : null;
            // Срок: ръчно зададен има приоритет; иначе авто = дата на производство + срок на годност (дни)
            let expiryDate: Date | null = info?.expiryDate
              ? new Date(info.expiryDate)
              : null;
            if (!expiryDate && manufacturingDate && product.shelfLifeDays) {
              expiryDate = new Date(manufacturingDate);
              expiryDate.setDate(expiryDate.getDate() + product.shelfLifeDays);
            }

            await tx.inventoryBatch.create({
              data: {
                batchNumber,
                quantity: item.quantity,
                initialQty: item.quantity,
                unitCost: item.unitPrice,
                manufacturingDate,
                expiryDate,
                companyId,
                productId: item.productId,
                locationId,
                goodsReceiptItemId: item.id,
              },
            });
          }
        }
      }

      // === Remove inventory when cancelling a delivered receipt ===
      if (isCancellingDelivered) {
        const itemIds = receipt.items.map((item) => item.id);

        // Check that no inventory batches have been partially consumed
        const consumedBatches = await tx.inventoryBatch.findMany({
          where: { goodsReceiptItemId: { in: itemIds } },
        });
        for (const batch of consumedBatches) {
          if (Number(batch.quantity) < Number(batch.initialQty)) {
            throw new BadRequestException(
              'Не може да се отмени доставка, от която вече е изписана стока. ' +
                `Партида ${batch.batchNumber}: налични ${batch.quantity} от ${batch.initialQty}`,
            );
          }
        }

        // Check that no serials have been sold/reserved
        const consumedSerials = await tx.inventorySerial.findMany({
          where: {
            goodsReceiptItemId: { in: itemIds },
            status: { not: 'IN_STOCK' },
          },
          select: { serialNumber: true, status: true },
        });
        if (consumedSerials.length > 0) {
          const examples = consumedSerials
            .slice(0, 3)
            .map((s) => s.serialNumber)
            .join(', ');
          throw new BadRequestException(
            `Не може да се отмени доставка със серийни номера, които вече не са в наличност: ${examples}`,
          );
        }

        // Safe to delete — all inventory is untouched
        await tx.inventoryBatch.deleteMany({
          where: { goodsReceiptItemId: { in: itemIds } },
        });
        await tx.inventorySerial.deleteMany({
          where: { goodsReceiptItemId: { in: itemIds } },
        });
      }

      // === Cancel attached expenses when the receipt is cancelled ===
      // (Expense payment now follows the receipt's payment ledger, not its
      // delivery status — see PaymentsService.recalculateGoodsReceiptState.)
      if (targetStatus === 'CANCELLED') {
        await tx.expense.updateMany({
          where: { goodsReceiptId: id },
          data: { status: 'CANCELLED' },
        });
      }

      // === Update receipt status ===
      // При EXPECTED → DELIVERED записваме реалната дата на доставка.
      const receiptUpdateData: {
        status: GoodsReceiptStatus;
        deliveredAt?: Date;
      } = { status: targetStatus };
      if (isDelivering) {
        receiptUpdateData.deliveredAt = deliveredAtOverride
          ? new Date(deliveredAtOverride)
          : new Date();
      }
      return tx.goodsReceipt.update({
        where: { id },
        data: receiptUpdateData,
        include: RECEIPT_INCLUDE,
      });
    });

    // Sync inventory to integrations (fire-and-forget). Each provider is
    // wrapped in its own .catch — one failing must never block the others.
    if (isDelivering || isCancellingDelivered) {
      const productIds = [
        ...new Set(receipt.items.map((item) => item.productId)),
      ];
      for (const productId of productIds) {
        this.wordPressService.syncProduct(companyId, productId).catch(() => {});
        this.cloudCartService
          .syncProductToCloudCart(companyId, productId)
          .catch(() => {});
      }
      this.dispatchStockChanged(companyId, productIds).catch(() => {});
    }

    return result;
  }

  // Build the `stock.changed` event payload for a batch of products and
  // hand it off to the webhook dispatcher. Reads current inventory from
  // InventoryBatch totals so subscribers get the post-update number.
  private async dispatchStockChanged(
    companyId: string,
    productIds: string[],
  ): Promise<void> {
    if (productIds.length === 0) return;
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
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
    const items = products.map((p) => ({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.trackInventory
        ? p.inventoryBatches.reduce((sum, b) => sum + Number(b.quantity), 0)
        : null,
    }));
    await this.webhookDispatcher.dispatch(companyId, 'stock.changed', {
      items,
    });
  }

  async cancel(companyId: string, id: string) {
    return this.updateStatus(companyId, id, 'CANCELLED');
  }

  async remove(companyId: string, id: string) {
    const receipt = await this.findOne(companyId, id);

    if (receipt.status !== 'EXPECTED') {
      throw new BadRequestException(
        ErrorMessages.goodsReceipts.canOnlyDeleteExpected,
      );
    }

    // Delete linked expenses first, then the receipt
    await this.prisma.$transaction(async (tx) => {
      await tx.expense.deleteMany({
        where: { goodsReceiptId: id },
      });
      await tx.goodsReceipt.delete({ where: { id } });
    });

    return { message: 'Доставката е изтрита успешно' };
  }
}
