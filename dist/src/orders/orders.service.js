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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const error_messages_1 = require("../common/constants/error-messages");
let OrdersService = class OrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDefaultVatRate(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { vatNumber: true },
        });
        return company?.vatNumber ? 20 : 0;
    }
    async generateOrderNumber(companyId) {
        const year = new Date().getFullYear();
        const prefix = `ORD-${year}-`;
        const lastOrder = await this.prisma.order.findFirst({
            where: {
                companyId,
                orderNumber: { startsWith: prefix },
            },
            orderBy: { orderNumber: 'desc' },
        });
        let nextNumber = 1;
        if (lastOrder) {
            const lastNumber = parseInt(lastOrder.orderNumber.split('-').pop() || '0');
            nextNumber = lastNumber + 1;
        }
        return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
    }
    async create(companyId, userId, dto) {
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.orders.mustHaveItems);
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            throw new common_1.NotFoundException('Компанията не е намерена');
        }
        const defaultVatRate = company.vatNumber ? 20 : 0;
        if (dto.locationId) {
            const location = await this.prisma.location.findFirst({
                where: { id: dto.locationId, companyId },
            });
            if (!location) {
                throw new common_1.NotFoundException(error_messages_1.ErrorMessages.orders.locationNotFound);
            }
        }
        const productIds = dto.items.map((item) => item.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, companyId },
        });
        if (products.length !== productIds.length) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.orders.productsNotFound);
        }
        const orderNumber = dto.orderNumber || (await this.generateOrderNumber(companyId));
        const currencyId = dto.currencyId || company.currencyId;
        let subtotal = 0;
        let vatAmount = 0;
        const itemsData = dto.items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
            const itemVatRate = item.vatRate ?? (isNaN(productVatRate) ? defaultVatRate : productVatRate);
            const itemDiscount = item.discount ?? 0;
            const itemSubtotal = item.quantity * item.unitPrice - itemDiscount;
            const itemVat = itemSubtotal * (itemVatRate / 100);
            subtotal += itemSubtotal;
            vatAmount += itemVat;
            return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: itemVatRate,
                discount: itemDiscount,
                subtotal: itemSubtotal,
                inventoryBatchId: item.inventoryBatchId,
            };
        });
        const orderDiscount = dto.discount ?? 0;
        const shippingCost = dto.shippingCost ?? 0;
        const total = subtotal + vatAmount + shippingCost - orderDiscount;
        return this.prisma.order.create({
            data: {
                orderNumber,
                orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
                status: 'PENDING',
                customerId: dto.customerId,
                customerName: dto.customerName,
                customerEmail: dto.customerEmail,
                customerPhone: dto.customerPhone,
                shippingAddress: dto.shippingAddress,
                shippingCity: dto.shippingCity,
                shippingPostalCode: dto.shippingPostalCode,
                paymentMethod: dto.paymentMethod,
                shippingCost,
                discount: orderDiscount,
                subtotal,
                vatAmount,
                total,
                notes: dto.notes,
                currencyId,
                companyId,
                locationId: dto.locationId,
                createdById: userId,
                items: {
                    create: itemsData,
                },
            },
            include: {
                location: true,
                customer: true,
                currency: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                items: {
                    include: {
                        product: true,
                        inventoryBatch: true,
                    },
                },
                _count: { select: { items: true } },
            },
        });
    }
    async findAll(companyId, query) {
        const { search, status, paymentStatus, locationId, dateFrom, dateTo, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
            ...(status && { status }),
            ...(paymentStatus && { paymentStatus }),
            ...(locationId && { locationId }),
            ...(dateFrom || dateTo
                ? {
                    orderDate: {
                        ...(dateFrom && { gte: new Date(dateFrom) }),
                        ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
                    },
                }
                : {}),
            ...(search && {
                OR: [
                    { orderNumber: { contains: search, mode: 'insensitive' } },
                    { customerName: { contains: search, mode: 'insensitive' } },
                    { customerEmail: { contains: search, mode: 'insensitive' } },
                    { customerPhone: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                include: {
                    location: true,
                    customer: true,
                    currency: true,
                    createdBy: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                    items: {
                        include: {
                            product: true,
                            inventoryBatch: true,
                        },
                    },
                    _count: { select: { items: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.order.count({ where }),
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
        const order = await this.prisma.order.findFirst({
            where: { id, companyId },
            include: {
                location: true,
                customer: true,
                currency: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                items: {
                    include: {
                        product: true,
                        inventoryBatch: true,
                    },
                },
                _count: { select: { items: true } },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(error_messages_1.ErrorMessages.orders.notFound);
        }
        return order;
    }
    async update(companyId, id, dto) {
        const order = await this.findOne(companyId, id);
        if (order.status !== 'PENDING' && dto.status === undefined) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.orders.canOnlyUpdatePending);
        }
        if (dto.locationId) {
            const location = await this.prisma.location.findFirst({
                where: { id: dto.locationId, companyId },
            });
            if (!location) {
                throw new common_1.NotFoundException(error_messages_1.ErrorMessages.orders.locationNotFound);
            }
        }
        return this.prisma.order.update({
            where: { id },
            data: {
                ...(dto.orderDate && { orderDate: new Date(dto.orderDate) }),
                ...(dto.status && { status: dto.status }),
                ...(dto.customerName && { customerName: dto.customerName }),
                ...(dto.customerEmail !== undefined && {
                    customerEmail: dto.customerEmail,
                }),
                ...(dto.customerPhone !== undefined && {
                    customerPhone: dto.customerPhone,
                }),
                ...(dto.shippingAddress !== undefined && {
                    shippingAddress: dto.shippingAddress,
                }),
                ...(dto.shippingCity !== undefined && {
                    shippingCity: dto.shippingCity,
                }),
                ...(dto.shippingPostalCode !== undefined && {
                    shippingPostalCode: dto.shippingPostalCode,
                }),
                ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
                ...(dto.paymentStatus && { paymentStatus: dto.paymentStatus }),
                ...(dto.locationId && { locationId: dto.locationId }),
                ...(dto.shippingCost !== undefined && {
                    shippingCost: dto.shippingCost,
                }),
                ...(dto.discount !== undefined && { discount: dto.discount }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
            },
            include: {
                location: true,
                customer: true,
                currency: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                items: {
                    include: {
                        product: true,
                        inventoryBatch: true,
                    },
                },
                _count: { select: { items: true } },
            },
        });
    }
    async confirm(companyId, id) {
        const order = await this.findOne(companyId, id);
        if (order.status !== 'PENDING') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.orders.canOnlyConfirmPending);
        }
        if (!order.items || order.items.length === 0) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.orders.cannotConfirmWithoutItems);
        }
        return this.prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                });
                if (!product || product.type === 'SERVICE' || !product.trackInventory) {
                    continue;
                }
                const quantity = Number(item.quantity);
                if (item.inventoryBatchId) {
                    const batch = await tx.inventoryBatch.findUnique({
                        where: { id: item.inventoryBatchId },
                    });
                    if (!batch) {
                        throw new common_1.BadRequestException(`Партидата за продукт "${product.name}" не е намерена`);
                    }
                    if (Number(batch.quantity) < quantity) {
                        throw new common_1.BadRequestException(`${error_messages_1.ErrorMessages.inventory.insufficientStock}: "${product.name}" - ` +
                            `налични: ${Number(batch.quantity)}, заявени: ${quantity}`);
                    }
                    await tx.inventoryBatch.update({
                        where: { id: item.inventoryBatchId },
                        data: { quantity: Number(batch.quantity) - quantity },
                    });
                }
                else {
                    const batches = await tx.inventoryBatch.findMany({
                        where: {
                            companyId,
                            productId: item.productId,
                            quantity: { gt: 0 },
                            ...(order.locationId && { locationId: order.locationId }),
                        },
                        orderBy: { createdAt: 'asc' },
                    });
                    const totalAvailable = batches.reduce((sum, b) => sum + Number(b.quantity), 0);
                    if (totalAvailable < quantity) {
                        throw new common_1.BadRequestException(`${error_messages_1.ErrorMessages.inventory.insufficientStock}: "${product.name}" - ` +
                            `налични: ${totalAvailable}, заявени: ${quantity}`);
                    }
                    let remaining = quantity;
                    for (const batch of batches) {
                        if (remaining <= 0)
                            break;
                        const batchQty = Number(batch.quantity);
                        const deduct = Math.min(batchQty, remaining);
                        await tx.inventoryBatch.update({
                            where: { id: batch.id },
                            data: { quantity: batchQty - deduct },
                        });
                        remaining -= deduct;
                    }
                }
            }
            return tx.order.update({
                where: { id },
                data: { status: 'CONFIRMED' },
                include: {
                    location: true,
                    customer: true,
                    currency: true,
                    createdBy: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                    items: {
                        include: {
                            product: true,
                            inventoryBatch: true,
                        },
                    },
                    _count: { select: { items: true } },
                },
            });
        });
    }
    async updateStatus(companyId, id, status) {
        await this.findOne(companyId, id);
        return this.prisma.order.update({
            where: { id },
            data: { status },
            include: {
                location: true,
                customer: true,
                currency: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
                items: {
                    include: {
                        product: true,
                        inventoryBatch: true,
                    },
                },
                _count: { select: { items: true } },
            },
        });
    }
    async cancel(companyId, id) {
        const order = await this.findOne(companyId, id);
        if (order.status === 'CANCELLED') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.orders.alreadyCancelled);
        }
        if (order.status === 'DELIVERED') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.orders.cannotCancelDelivered);
        }
        const needsRestore = ['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(order.status);
        return this.prisma.$transaction(async (tx) => {
            if (needsRestore) {
                for (const item of order.items) {
                    const product = await tx.product.findUnique({
                        where: { id: item.productId },
                    });
                    if (!product || product.type === 'SERVICE' || !product.trackInventory) {
                        continue;
                    }
                    const quantity = Number(item.quantity);
                    if (item.inventoryBatchId) {
                        const batch = await tx.inventoryBatch.findUnique({
                            where: { id: item.inventoryBatchId },
                        });
                        if (batch) {
                            await tx.inventoryBatch.update({
                                where: { id: item.inventoryBatchId },
                                data: { quantity: Number(batch.quantity) + quantity },
                            });
                        }
                    }
                    else {
                        const batch = await tx.inventoryBatch.findFirst({
                            where: {
                                companyId,
                                productId: item.productId,
                                ...(order.locationId && { locationId: order.locationId }),
                            },
                            orderBy: { createdAt: 'asc' },
                        });
                        if (batch) {
                            await tx.inventoryBatch.update({
                                where: { id: batch.id },
                                data: { quantity: Number(batch.quantity) + quantity },
                            });
                        }
                    }
                }
            }
            return tx.order.update({
                where: { id },
                data: { status: 'CANCELLED' },
                include: {
                    location: true,
                    customer: true,
                    currency: true,
                    createdBy: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                    items: {
                        include: {
                            product: true,
                            inventoryBatch: true,
                        },
                    },
                    _count: { select: { items: true } },
                },
            });
        });
    }
    async remove(companyId, id) {
        const order = await this.findOne(companyId, id);
        if (order.status !== 'PENDING') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.orders.canOnlyDeletePending);
        }
        await this.prisma.order.delete({ where: { id } });
        return { message: 'Поръчката е изтрита успешно' };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map