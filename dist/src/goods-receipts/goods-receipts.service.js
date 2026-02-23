"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoodsReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const purchase_orders_service_1 = require("../purchase-orders/purchase-orders.service");
const error_messages_1 = require("../common/constants/error-messages");
let GoodsReceiptsService = class GoodsReceiptsService {
    prisma;
    purchaseOrdersService;
    constructor(prisma, purchaseOrdersService) {
        this.prisma = prisma;
        this.purchaseOrdersService = purchaseOrdersService;
    }
    async generateReceiptNumber(companyId) {
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
            const lastNumber = parseInt(lastReceipt.receiptNumber.split('-').pop() || '0');
            nextNumber = lastNumber + 1;
        }
        return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
    }
    async create(companyId, userId, dto) {
        console.log('[GoodsReceipts] Creating receipt with DTO:', JSON.stringify(dto, null, 2));
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException(error_messages_1.ErrorMessages.goodsReceipts.companyNotFound);
        }
        const location = await this.prisma.location.findFirst({
            where: { id: dto.locationId, companyId },
        });
        if (!location) {
            throw new common_1.NotFoundException(error_messages_1.ErrorMessages.goodsReceipts.locationNotFound);
        }
        if (dto.supplierId) {
            const supplier = await this.prisma.supplier.findFirst({
                where: { id: dto.supplierId, companyId },
            });
            if (!supplier) {
                throw new common_1.NotFoundException(error_messages_1.ErrorMessages.goodsReceipts.supplierNotFound);
            }
        }
        const receiptNumber = dto.receiptNumber || (await this.generateReceiptNumber(companyId));
        const productIds = dto.items.map((item) => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, companyId },
        });
        if (products.length !== productIds.length) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.goodsReceipts.productsNotFound);
        }
        const currencyId = dto.currencyId || company.currencyId;
        const exchangeRate = dto.exchangeRate ?? 1;
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
            purchaseOrderId: dto.purchaseOrderId || undefined,
            createdById: userId,
            items: {
                create: dto.items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    vatRate: item.vatRate ?? (company.vatNumber ? 20 : 0),
                    currencyId: item.currencyId || currencyId,
                    exchangeRate: item.exchangeRate ?? 1,
                    purchaseOrderItemId: item.purchaseOrderItemId || undefined,
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
        }
        catch (error) {
            console.error('[GoodsReceipts] Prisma create error:', error);
            throw error;
        }
    }
    async findAll(companyId, query) {
        const { search, status, locationId, supplierId, dateFrom, dateTo, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
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
    async findOne(companyId, id) {
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
            throw new common_1.NotFoundException(error_messages_1.ErrorMessages.goodsReceipts.notFound);
        }
        return receipt;
    }
    async update(companyId, id, dto) {
        const receipt = await this.findOne(companyId, id);
        if (receipt.status !== 'DRAFT') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.goodsReceipts.canOnlyUpdateDraft);
        }
        if (dto.locationId) {
            const location = await this.prisma.location.findFirst({
                where: { id: dto.locationId, companyId },
            });
            if (!location) {
                throw new common_1.NotFoundException(error_messages_1.ErrorMessages.goodsReceipts.locationNotFound);
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
    async confirm(companyId, id) {
        console.log(`[Service] confirm() called with companyId=${companyId}, id=${id}`);
        const receipt = await this.findOne(companyId, id);
        if (receipt.status !== 'DRAFT') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.goodsReceipts.canOnlyConfirmDraft);
        }
        if (!receipt.items || receipt.items.length === 0) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.goodsReceipts.cannotConfirmWithoutItems);
        }
        const updated = await this.prisma.$transaction(async (tx) => {
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
                            purchaseOrderItem: true,
                        },
                    },
                    _count: { select: { items: true } },
                },
            });
            console.log(`[GoodsReceipts] Confirming receipt ${receipt.receiptNumber} with ${receipt.items.length} items`);
            for (const item of updatedReceipt.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                });
                console.log(`[GoodsReceipts] Item ${item.id}: product=${product?.name}, type=${product?.type}`);
                if (product && product.type !== 'SERIAL') {
                    const batchNumber = `${receipt.receiptNumber}-${item.id.slice(-4)}`;
                    console.log(`[GoodsReceipts] Creating batch: ${batchNumber}, qty=${item.quantity}, location=${receipt.locationId}`);
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
                }
                else {
                    console.log(`[GoodsReceipts] Skipping batch creation - product not found or is SERIAL`);
                }
                if (item.purchaseOrderItemId) {
                    const currentItem = await tx.purchaseOrderItem.findUnique({
                        where: { id: item.purchaseOrderItemId },
                    });
                    if (currentItem) {
                        await tx.purchaseOrderItem.update({
                            where: { id: item.purchaseOrderItemId },
                            data: {
                                receivedQty: Number(currentItem.receivedQty) + Number(item.quantity),
                            },
                        });
                        console.log(`[GoodsReceipts] Updated PO item ${item.purchaseOrderItemId} receivedQty`);
                    }
                }
            }
            return updatedReceipt;
        });
        if (receipt.purchaseOrderId) {
            await this.purchaseOrdersService.updateReceivedQuantities(companyId, receipt.purchaseOrderId);
            console.log(`[GoodsReceipts] Updated purchase order ${receipt.purchaseOrderId} status`);
        }
        return updated;
    }
    async cancel(companyId, id) {
        const receipt = await this.findOne(companyId, id);
        if (receipt.status === 'CANCELLED') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.goodsReceipts.alreadyCancelled);
        }
        if (receipt.status === 'COMPLETED') {
            return this.prisma.$transaction(async (tx) => {
                await tx.inventoryBatch.deleteMany({
                    where: {
                        goodsReceiptItemId: {
                            in: receipt.items.map((item) => item.id),
                        },
                    },
                });
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
    async remove(companyId, id) {
        const receipt = await this.findOne(companyId, id);
        if (receipt.status !== 'DRAFT') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.goodsReceipts.canOnlyDeleteDraft);
        }
        await this.prisma.goodsReceipt.delete({ where: { id } });
        return { message: 'Стоковата разписка е изтрита успешно' };
    }
};
exports.GoodsReceiptsService = GoodsReceiptsService;
exports.GoodsReceiptsService = GoodsReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => purchase_orders_service_1.PurchaseOrdersService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        purchase_orders_service_1.PurchaseOrdersService])
], GoodsReceiptsService);
//# sourceMappingURL=goods-receipts.service.js.map