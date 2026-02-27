import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
  constructor(
    private prisma: PrismaService,
  ) {}

  private async generateReceiptNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GR-${year}-`;

    const lastReceipt = await this.prisma.goodsReceipt.findFirst({
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
    console.log('[GoodsReceipts] Creating receipt with DTO:', JSON.stringify(dto, null, 2));

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

    // Generate receipt number if not provided
    const receiptNumber =
      dto.receiptNumber || (await this.generateReceiptNumber(companyId));

    // Verify all products exist
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException(ErrorMessages.goodsReceipts.productsNotFound);
    }

    // Use company currency as default
    const currencyId = dto.currencyId || company.currencyId;
    const exchangeRate = dto.exchangeRate ?? 1;

    // Prepare data with proper null handling for optional fields
    const createData = {
      receiptNumber,
      receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
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

    console.log('[GoodsReceipts] Prisma create data:', JSON.stringify(createData, null, 2));

    try {
      return await this.prisma.goodsReceipt.create({
        data: createData,
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
    } catch (error) {
      console.error('[GoodsReceipts] Prisma create error:', error);
      throw error;
    }
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
              ...(dateFrom && { gte: new Date(dateFrom) }),
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

  async confirm(companyId: string, id: string) {
    console.log(
      `[Service] confirm() called with companyId=${companyId}, id=${id}`,
    );
    const receipt = await this.findOne(companyId, id);

    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException(ErrorMessages.goodsReceipts.canOnlyConfirmDraft);
    }

    if (!receipt.items || receipt.items.length === 0) {
      throw new BadRequestException(ErrorMessages.goodsReceipts.cannotConfirmWithoutItems);
    }

    // Use transaction to update receipt status and create inventory batches
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
            },
          },
          _count: { select: { items: true } },
        },
      });

      // Create inventory batches for each item (for products with BATCH or NONE tracking)
      console.log(
        `[GoodsReceipts] Confirming receipt ${receipt.receiptNumber} with ${receipt.items.length} items`,
      );
      for (const item of updatedReceipt.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        console.log(
          `[GoodsReceipts] Item ${item.id}: product=${product?.name}, type=${product?.type}`,
        );

        if (product && product.type !== 'SERIAL') {
          // Generate batch number
          const batchNumber = `${receipt.receiptNumber}-${item.id.slice(-4)}`;

          console.log(
            `[GoodsReceipts] Creating batch: ${batchNumber}, qty=${item.quantity}, location=${receipt.locationId}`,
          );

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
          console.log(`[GoodsReceipts] Batch created successfully`);
        } else {
          console.log(
            `[GoodsReceipts] Skipping batch creation - product not found or is SERIAL`,
          );
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
        // Delete inventory batches created from this receipt
        await tx.inventoryBatch.deleteMany({
          where: {
            goodsReceiptItemId: {
              in: receipt.items.map((item) => item.id),
            },
          },
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
