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
exports.InvoicesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const error_messages_1 = require("../common/constants/error-messages");
let InvoicesService = class InvoicesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateInvoiceNumber(companyId, typePrefix = 'INV') {
        const year = new Date().getFullYear();
        const prefix = `${typePrefix}-${year}-`;
        const lastInvoice = await this.prisma.invoice.findFirst({
            where: {
                companyId,
                invoiceNumber: { startsWith: prefix },
            },
            orderBy: { invoiceNumber: 'desc' },
        });
        let nextNumber = 1;
        if (lastInvoice) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
            nextNumber = lastNumber + 1;
        }
        return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
    }
    invoiceInclude = {
        order: {
            select: {
                id: true,
                orderNumber: true,
                orderDate: true,
                status: true,
            },
        },
        customer: true,
        currency: true,
        createdBy: {
            select: { id: true, firstName: true, lastName: true },
        },
        items: {
            include: {
                product: {
                    select: { id: true, sku: true, name: true, unit: true },
                },
                orderItem: true,
            },
        },
        _count: { select: { items: true } },
    };
    async createFromOrder(companyId, userId, dto) {
        const order = await this.prisma.order.findFirst({
            where: { id: dto.orderId, companyId },
            include: {
                customer: true,
                items: {
                    include: { product: true },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(error_messages_1.ErrorMessages.invoices.orderNotFound);
        }
        const allowedStatuses = [
            'CONFIRMED',
            'PROCESSING',
            'SHIPPED',
            'DELIVERED',
        ];
        if (!allowedStatuses.includes(order.status)) {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.canOnlyCreateFromConfirmed);
        }
        const invoiceNumber = await this.generateInvoiceNumber(companyId);
        let customerEik = null;
        let customerVatNumber = null;
        let customerAddress = order.shippingAddress;
        let customerCity = order.shippingCity;
        let customerPostalCode = order.shippingPostalCode;
        if (order.customer) {
            customerEik = order.customer.eik;
            customerVatNumber = order.customer.vatNumber;
            customerAddress = customerAddress || order.customer.address;
            customerCity = customerCity || order.customer.city;
            customerPostalCode = customerPostalCode || order.customer.postalCode;
        }
        return this.prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                type: 'REGULAR',
                status: 'DRAFT',
                orderId: order.id,
                customerId: order.customerId,
                customerName: order.customerName,
                customerEik,
                customerVatNumber,
                customerAddress,
                customerCity,
                customerPostalCode,
                subtotal: order.subtotal,
                vatAmount: order.vatAmount,
                discount: order.discount,
                total: order.total,
                paymentMethod: order.paymentMethod,
                notes: dto.notes,
                companyId,
                createdById: userId,
                items: {
                    create: order.items.map((item) => ({
                        productId: item.productId,
                        description: item.product?.name || 'Артикул',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        vatRate: item.vatRate,
                        discount: item.discount,
                        total: item.subtotal,
                        orderItemId: item.id,
                    })),
                },
            },
            include: this.invoiceInclude,
        });
    }
    async createProforma(companyId, userId, dto) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { vatNumber: true, currencyId: true },
        });
        if (!company) {
            throw new common_1.NotFoundException('Компанията не е намерена');
        }
        const defaultVatRate = company.vatNumber ? 20 : 0;
        const productIds = dto.items
            .filter((item) => item.productId)
            .map((item) => item.productId);
        let products = [];
        if (productIds.length > 0) {
            products = await this.prisma.product.findMany({
                where: { id: { in: productIds }, companyId },
            });
            const foundIds = new Set(products.map((p) => p.id));
            const missingIds = productIds.filter((id) => !foundIds.has(id));
            if (missingIds.length > 0) {
                throw new common_1.BadRequestException('Някои от посочените продукти не са намерени');
            }
        }
        const invoiceNumber = await this.generateInvoiceNumber(companyId, 'PRO');
        const currencyId = dto.currencyId || company.currencyId;
        let subtotal = 0;
        let vatAmount = 0;
        const itemsData = dto.items.map((item) => {
            const product = item.productId
                ? products.find((p) => p.id === item.productId)
                : null;
            const productVatRate = product ? Number(product.vatRate) : defaultVatRate;
            const itemVatRate = item.vatRate ?? (isNaN(productVatRate) ? defaultVatRate : productVatRate);
            const itemDiscount = item.discount ?? 0;
            const itemSubtotal = item.quantity * item.unitPrice - itemDiscount;
            const itemVat = itemSubtotal * (itemVatRate / 100);
            subtotal += itemSubtotal;
            vatAmount += itemVat;
            return {
                productId: item.productId || null,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: itemVatRate,
                discount: itemDiscount,
                total: itemSubtotal,
            };
        });
        const invoiceDiscount = dto.discount ?? 0;
        const total = subtotal + vatAmount - invoiceDiscount;
        return this.prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                type: 'PROFORMA',
                status: 'DRAFT',
                customerId: dto.customerId || null,
                customerName: dto.customerName,
                customerEik: dto.customerEik || null,
                customerVatNumber: dto.customerVatNumber || null,
                customerAddress: dto.customerAddress || null,
                customerCity: dto.customerCity || null,
                customerPostalCode: dto.customerPostalCode || null,
                subtotal,
                vatAmount,
                discount: invoiceDiscount,
                total,
                paymentMethod: dto.paymentMethod || null,
                notes: dto.notes || null,
                currencyId,
                companyId,
                createdById: userId,
                items: {
                    create: itemsData,
                },
            },
            include: this.invoiceInclude,
        });
    }
    async findAll(companyId, query) {
        const { search, status, orderId, customerId, dateFrom, dateTo, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            companyId,
            ...(status && { status }),
            ...(orderId && { orderId }),
            ...(customerId && { customerId }),
            ...(dateFrom || dateTo
                ? {
                    invoiceDate: {
                        ...(dateFrom && { gte: new Date(dateFrom) }),
                        ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
                    },
                }
                : {}),
            ...(search && {
                OR: [
                    { invoiceNumber: { contains: search, mode: 'insensitive' } },
                    { customerName: { contains: search, mode: 'insensitive' } },
                    { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                include: {
                    order: {
                        select: { id: true, orderNumber: true, status: true },
                    },
                    customer: true,
                    _count: { select: { items: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.invoice.count({ where }),
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
        const invoice = await this.prisma.invoice.findFirst({
            where: { id, companyId },
            include: this.invoiceInclude,
        });
        if (!invoice) {
            throw new common_1.NotFoundException(error_messages_1.ErrorMessages.invoices.notFound);
        }
        return invoice;
    }
    async update(companyId, id, dto) {
        const invoice = await this.findOne(companyId, id);
        if (invoice.status !== 'DRAFT') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.canOnlyUpdateDraft);
        }
        return this.prisma.invoice.update({
            where: { id },
            data: {
                ...(dto.dueDate !== undefined && {
                    dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
            },
            include: this.invoiceInclude,
        });
    }
    async issue(companyId, id) {
        const invoice = await this.findOne(companyId, id);
        if (invoice.status !== 'DRAFT') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.canOnlyIssueDraft);
        }
        return this.prisma.invoice.update({
            where: { id },
            data: { status: 'ISSUED' },
            include: this.invoiceInclude,
        });
    }
    async recordPayment(companyId, id, dto) {
        const invoice = await this.findOne(companyId, id);
        if (invoice.status === 'DRAFT') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.cannotPayDraft);
        }
        if (invoice.status === 'CANCELLED') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.cannotPayCancelled);
        }
        if (invoice.status === 'PAID') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.alreadyFullyPaid);
        }
        const newPaidAmount = Number(invoice.paidAmount) + dto.amount;
        const invoiceTotal = Number(invoice.total);
        let newStatus = invoice.status;
        if (newPaidAmount >= invoiceTotal) {
            newStatus = 'PAID';
        }
        else if (newPaidAmount > 0) {
            newStatus = 'PARTIALLY_PAID';
        }
        return this.prisma.invoice.update({
            where: { id },
            data: {
                paidAmount: Math.min(newPaidAmount, invoiceTotal),
                status: newStatus,
                paymentMethod: dto.paymentMethod || invoice.paymentMethod,
                paymentDate: new Date(),
            },
            include: this.invoiceInclude,
        });
    }
    async cancel(companyId, id) {
        const invoice = await this.findOne(companyId, id);
        if (invoice.status === 'PAID') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.cannotCancelPaid);
        }
        if (invoice.status === 'PARTIALLY_PAID') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.cannotCancelPartiallyPaid);
        }
        if (invoice.status === 'CANCELLED') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.alreadyCancelled);
        }
        return this.prisma.invoice.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: this.invoiceInclude,
        });
    }
    async remove(companyId, id) {
        const invoice = await this.findOne(companyId, id);
        if (invoice.status !== 'DRAFT') {
            throw new common_1.BadRequestException(error_messages_1.ErrorMessages.invoices.canOnlyDeleteDraft);
        }
        await this.prisma.invoice.delete({ where: { id } });
        return { message: 'Фактурата е изтрита успешно' };
    }
    async findByOrder(companyId, orderId) {
        return this.prisma.invoice.findMany({
            where: { companyId, orderId },
            include: {
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.InvoicesService = InvoicesService;
exports.InvoicesService = InvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InvoicesService);
//# sourceMappingURL=invoices.service.js.map