import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
  QueryGoodsReceiptsDto,
} from './dto';
import { Prisma } from '@prisma/client';
import { ErrorMessages } from '../common/constants/error-messages';

@Injectable()
export class GoodsReceiptsService {
  private readonly logger = new Logger(GoodsReceiptsService.name);

  constructor(
    private prisma: PrismaService,
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

  async create(companyId: string, userId: string, dto: CreateGoodsReceiptDto) {
    // Get company for default currency
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new NotFoundException(ErrorMessages.goodsReceipts.companyNotFound);
    }

    // Verify location exists and belongs to company
    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, companyId },
    });
    if (!location) {
      throw new NotFoundException(ErrorMessages.goodsReceipts.locationNotFound);
    }

    // Verify supplier if provided
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, companyId },
      });
      if (!supplier) {
        throw new NotFoundException(ErrorMessages.goodsReceipts.supplierNotFound);
      }
    }

    // Verify all products exist (deduplicate IDs to avoid false mismatch)
    const uniqueProductIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, companyId },
    });
    if (products.length !== uniqueProductIds.length) {
      throw new BadRequestException(ErrorMessages.goodsReceipts.productsNotFound);
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
      locationId: dto.locationId,
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

      return tx.goodsReceipt.create({
        data: { ...createData, receiptNumber },
        include: {
          location: true,
          supplier: true,
          currency: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: true,
              currency: true,
            },
          },
          _count: { select: { items: true } },
        },
      });
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
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    return {
      data,
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
      include: {
        location: true,
        supplier: true,
        currency: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
            currency: true,
          },
        },
        _count: { select: { items: true } },
      },
    });

    if (!receipt) {
      throw new NotFoundException(ErrorMessages.goodsReceipts.notFound);
    }

    return receipt;
  }

  async update(companyId: string, id: string, dto: UpdateGoodsReceiptDto) {
    const receipt = await this.findOne(companyId, id);

    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.goodsReceipts.canOnlyUpdateDraft);
    }

    // Verify new location if provided
    if (dto.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: dto.locationId, companyId },
      });
      if (!location) {
        throw new NotFoundException(ErrorMessages.goodsReceipts.locationNotFound);
      }
    }

    // If items are provided, validate products and replace all items in a transaction
    if (dto.items && dto.items.length > 0) {
      const newItems = dto.items;
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });

      const uniqueProductIds = [...new Set(newItems.map((item) => item.productId))];
      const products = await this.prisma.product.findMany({
        where: { id: { in: uniqueProductIds }, companyId },
      });
      if (products.length !== uniqueProductIds.length) {
        throw new BadRequestException(ErrorMessages.goodsReceipts.productsNotFound);
      }

      const currencyId = dto.currencyId || receipt.currencyId;

      return this.prisma.$transaction(async (tx) => {
        // Delete existing items
        await tx.goodsReceiptItem.deleteMany({
          where: { goodsReceiptId: id },
        });

        // Update receipt with new items
        return tx.goodsReceipt.update({
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
            items: {
              create: newItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate ?? (company?.vatNumber ? 20 : 0),
                currencyId: item.currencyId || currencyId,
                exchangeRate: item.exchangeRate ?? 1,
              })),
            },
          },
          include: {
            location: true,
            supplier: true,
            currency: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            items: {
              include: {
                product: true,
                currency: true,
              },
            },
            _count: { select: { items: true } },
          },
        });
      });
    }

    return this.prisma.goodsReceipt.update({
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
      include: {
        location: true,
        supplier: true,
        currency: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
            currency: true,
          },
        },
        _count: { select: { items: true } },
      },
    });
  }

  async confirm(
    companyId: string,
    id: string,
    itemSerials?: { goodsReceiptItemId: string; serialNumbers: string[] }[],
  ) {
    const receipt = await this.findOne(companyId, id);

    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.goodsReceipts.canOnlyConfirmDraft);
    }

    if (!receipt.items || receipt.items.length === 0) {
      throw new BadRequestException(ErrorMessages.goodsReceipts.cannotConfirmWithoutItems);
    }

    // Build a map from goodsReceiptItemId -> serial numbers
    const serialsMap = new Map<string, string[]>();
    (itemSerials ?? []).forEach(({ goodsReceiptItemId, serialNumbers }) => {
      serialsMap.set(
        goodsReceiptItemId,
        serialNumbers.filter((s) => s.trim() !== ''),
      );
    });

    // Use transaction to update receipt status and create inventory
    const updated = await this.prisma.$transaction(async (tx) => {
      // Update receipt status
      const updatedReceipt = await tx.goodsReceipt.update({
        where: { id },
        data: { status: 'COMPLETED' },
        include: {
          location: true,
          supplier: true,
          currency: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          items: {
            include: {
              product: true,
              currency: true,
            },
          },
          _count: { select: { items: true } },
        },
      });

      // Create inventory records for each item
      for (const item of updatedReceipt.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) continue;

        // Skip inventory creation for SERVICE products
        if (product.type === 'SERVICE') continue;

        if (product.type === 'SERIAL') {
          // For SERIAL products: create one InventorySerial per unit
          const quantity = Math.round(Number(item.quantity));
          const provided = serialsMap.get(item.id) ?? [];

          // Build list of serial numbers
          const serialsToCreate: string[] = [];
          for (let i = 0; i < quantity; i++) {
            if (i < provided.length && provided[i].trim() !== '') {
              serialsToCreate.push(provided[i].trim());
            } else {
              const padded = String(i + 1).padStart(3, '0');
              serialsToCreate.push(
                `SN-${receipt.receiptNumber}-${padded}`,
              );
            }
          }

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

          // Create InventorySerial records
          for (const serialNumber of serialsToCreate) {
            await tx.inventorySerial.create({
              data: {
                serialNumber,
                status: 'IN_STOCK',
                unitCost: item.unitPrice,
                companyId,
                productId: item.productId,
                locationId: receipt.locationId,
                goodsReceiptItemId: item.id,
              },
            });
          }
        } else {
          // For PRODUCT, BATCH — create InventoryBatch
          const batchNumber = `${receipt.receiptNumber}-${item.id.slice(-4)}`;

          await tx.inventoryBatch.create({
            data: {
              batchNumber,
              quantity: item.quantity,
              initialQty: item.quantity,
              unitCost: item.unitPrice,
              companyId,
              productId: item.productId,
              locationId: receipt.locationId,
              goodsReceiptItemId: item.id,
            },
          });
        }
      }

      return updatedReceipt;
    });

    return updated;
  }

  async cancel(companyId: string, id: string) {
    const receipt = await this.findOne(companyId, id);

    if (receipt.status === 'CANCELLED') {
      throw new BadRequestException(ErrorMessages.goodsReceipts.alreadyCancelled);
    }

    // If completed, we need to remove inventory entries
    if (receipt.status === 'COMPLETED') {
      return this.prisma.$transaction(async (tx) => {
        const itemIds = receipt.items.map((item) => item.id);

        // Check that no inventory batches have been partially consumed
        const consumedBatches = await tx.inventoryBatch.findMany({
          where: {
            goodsReceiptItemId: { in: itemIds },
          },
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
          const examples = consumedSerials.slice(0, 3).map((s) => s.serialNumber).join(', ');
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

        // Update status
        return tx.goodsReceipt.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: {
            location: true,
            supplier: true,
            currency: true,
            createdBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            items: {
              include: {
                product: true,
                currency: true,
              },
            },
            _count: { select: { items: true } },
          },
        });
      });
    }

    // If draft, just cancel
    return this.prisma.goodsReceipt.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        location: true,
        supplier: true,
        currency: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
            currency: true,
          },
        },
        _count: { select: { items: true } },
      },
    });
  }

  async remove(companyId: string, id: string) {
    const receipt = await this.findOne(companyId, id);

    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.goodsReceipts.canOnlyDeleteDraft);
    }

    await this.prisma.goodsReceipt.delete({ where: { id } });

    return { message: 'Стоковата разписка е изтрита успешно' };
  }
}
