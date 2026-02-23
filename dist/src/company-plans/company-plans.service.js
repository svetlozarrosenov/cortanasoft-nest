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
exports.CompanyPlansService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CompanyPlansService = class CompanyPlansService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    planInclude = {
        company: {
            select: {
                id: true,
                name: true,
                eik: true,
                vatNumber: true,
                address: true,
                city: true,
                postalCode: true,
            },
        },
        currency: true,
        createdBy: {
            select: { id: true, firstName: true, lastName: true },
        },
        items: {
            include: {
                product: {
                    select: { id: true, sku: true, name: true, unit: true },
                },
            },
            orderBy: { sortOrder: 'asc' },
        },
        generatedInvoices: {
            include: {
                invoice: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        invoiceDate: true,
                        total: true,
                        status: true,
                    },
                },
            },
            orderBy: { billingPeriodStart: 'desc' },
            take: 10,
        },
        _count: {
            select: { items: true, generatedInvoices: true },
        },
    };
    async create(adminCompanyId, userId, dto) {
        const adminCompany = await this.prisma.company.findUnique({
            where: { id: adminCompanyId },
        });
        if (!adminCompany || adminCompany.role !== 'OWNER') {
            throw new common_1.ForbiddenException('Only the platform owner can manage company plans');
        }
        const targetCompany = await this.prisma.company.findUnique({
            where: { id: dto.companyId },
        });
        if (!targetCompany) {
            throw new common_1.NotFoundException('Target company not found');
        }
        const items = dto.items?.map((item) => {
            const total = item.quantity * item.unitPrice;
            return {
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate ?? 20,
                total,
                productId: item.productId,
                sortOrder: item.sortOrder ?? 0,
            };
        }) || [];
        const startDate = new Date(dto.startDate);
        const nextInvoiceDate = this.calculateNextInvoiceDate(startDate, dto.billingCycle || 'MONTHLY', dto.billingDayOfMonth || 1);
        return this.prisma.companyPlan.create({
            data: {
                companyId: dto.companyId,
                name: dto.name,
                description: dto.description,
                amount: dto.amount,
                currencyId: dto.currencyId,
                billingCycle: dto.billingCycle || 'MONTHLY',
                billingDayOfMonth: dto.billingDayOfMonth || 1,
                startDate,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                invoiceNotes: dto.invoiceNotes,
                status: dto.status || 'ACTIVE',
                autoInvoice: dto.autoInvoice ?? true,
                nextInvoiceDate,
                createdById: userId,
                items: {
                    create: items,
                },
            },
            include: this.planInclude,
        });
    }
    async findAll(adminCompanyId, query) {
        const adminCompany = await this.prisma.company.findUnique({
            where: { id: adminCompanyId },
        });
        if (!adminCompany || adminCompany.role !== 'OWNER') {
            throw new common_1.ForbiddenException('Only the platform owner can view company plans');
        }
        const { search, companyId, status, billingCycle, autoInvoice, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = query;
        const where = {
            ...(companyId && { companyId }),
            ...(status && { status }),
            ...(billingCycle && { billingCycle }),
            ...(autoInvoice !== undefined && { autoInvoice }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { company: { name: { contains: search, mode: 'insensitive' } } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            this.prisma.companyPlan.findMany({
                where,
                include: {
                    company: {
                        select: { id: true, name: true },
                    },
                    currency: true,
                    _count: { select: { items: true, generatedInvoices: true } },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.companyPlan.count({ where }),
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
    async findOne(adminCompanyId, id) {
        const adminCompany = await this.prisma.company.findUnique({
            where: { id: adminCompanyId },
        });
        if (!adminCompany || adminCompany.role !== 'OWNER') {
            throw new common_1.ForbiddenException('Only the platform owner can view company plans');
        }
        const plan = await this.prisma.companyPlan.findUnique({
            where: { id },
            include: this.planInclude,
        });
        if (!plan) {
            throw new common_1.NotFoundException('Company plan not found');
        }
        return plan;
    }
    async update(adminCompanyId, id, dto) {
        const adminCompany = await this.prisma.company.findUnique({
            where: { id: adminCompanyId },
        });
        if (!adminCompany || adminCompany.role !== 'OWNER') {
            throw new common_1.ForbiddenException('Only the platform owner can manage company plans');
        }
        const plan = await this.findOne(adminCompanyId, id);
        let itemsUpdate = {};
        if (dto.items !== undefined) {
            await this.prisma.companyPlanItem.deleteMany({
                where: { planId: id },
            });
            const items = dto.items.map((item) => {
                const quantity = item.quantity ?? 1;
                const unitPrice = item.unitPrice ?? 0;
                const total = quantity * unitPrice;
                return {
                    description: item.description || '',
                    quantity,
                    unitPrice,
                    vatRate: item.vatRate ?? 20,
                    total,
                    productId: item.productId,
                    sortOrder: item.sortOrder ?? 0,
                };
            });
            itemsUpdate = {
                items: {
                    create: items,
                },
            };
        }
        let nextInvoiceDate = plan.nextInvoiceDate;
        if (dto.billingCycle || dto.billingDayOfMonth || dto.startDate) {
            const startDate = dto.startDate ? new Date(dto.startDate) : plan.startDate;
            const billingCycle = dto.billingCycle || plan.billingCycle;
            const billingDayOfMonth = dto.billingDayOfMonth || plan.billingDayOfMonth;
            nextInvoiceDate = this.calculateNextInvoiceDate(startDate, billingCycle, billingDayOfMonth);
        }
        return this.prisma.companyPlan.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.amount !== undefined && { amount: dto.amount }),
                ...(dto.currencyId !== undefined && { currencyId: dto.currencyId }),
                ...(dto.billingCycle !== undefined && { billingCycle: dto.billingCycle }),
                ...(dto.billingDayOfMonth !== undefined && { billingDayOfMonth: dto.billingDayOfMonth }),
                ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
                ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
                ...(dto.invoiceNotes !== undefined && { invoiceNotes: dto.invoiceNotes }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.autoInvoice !== undefined && { autoInvoice: dto.autoInvoice }),
                nextInvoiceDate,
                ...itemsUpdate,
            },
            include: this.planInclude,
        });
    }
    async remove(adminCompanyId, id) {
        const adminCompany = await this.prisma.company.findUnique({
            where: { id: adminCompanyId },
        });
        if (!adminCompany || adminCompany.role !== 'OWNER') {
            throw new common_1.ForbiddenException('Only the platform owner can manage company plans');
        }
        const plan = await this.findOne(adminCompanyId, id);
        if (plan._count.generatedInvoices > 0) {
            throw new common_1.BadRequestException('Cannot delete plan with generated invoices. Consider cancelling it instead.');
        }
        await this.prisma.companyPlan.delete({ where: { id } });
        return { message: 'Company plan deleted successfully' };
    }
    async findByCompany(adminCompanyId, companyId) {
        const adminCompany = await this.prisma.company.findUnique({
            where: { id: adminCompanyId },
        });
        if (!adminCompany || adminCompany.role !== 'OWNER') {
            throw new common_1.ForbiddenException('Only the platform owner can view company plans');
        }
        return this.prisma.companyPlan.findMany({
            where: { companyId },
            include: {
                currency: true,
                _count: { select: { items: true, generatedInvoices: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateStatus(adminCompanyId, id, status) {
        const plan = await this.findOne(adminCompanyId, id);
        if (plan.status === 'CANCELLED' && status !== 'DRAFT') {
            throw new common_1.BadRequestException('Cannot change status of cancelled plan');
        }
        if (plan.status === 'EXPIRED') {
            throw new common_1.BadRequestException('Cannot change status of expired plan');
        }
        return this.prisma.companyPlan.update({
            where: { id },
            data: { status },
            include: this.planInclude,
        });
    }
    calculateNextInvoiceDate(startDate, billingCycle, billingDayOfMonth) {
        const now = new Date();
        let nextDate = new Date(startDate);
        nextDate.setDate(billingDayOfMonth);
        if (nextDate <= now) {
            switch (billingCycle) {
                case 'MONTHLY':
                    while (nextDate <= now) {
                        nextDate.setMonth(nextDate.getMonth() + 1);
                    }
                    break;
                case 'QUARTERLY':
                    while (nextDate <= now) {
                        nextDate.setMonth(nextDate.getMonth() + 3);
                    }
                    break;
                case 'SEMI_ANNUALLY':
                    while (nextDate <= now) {
                        nextDate.setMonth(nextDate.getMonth() + 6);
                    }
                    break;
                case 'ANNUALLY':
                    while (nextDate <= now) {
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                    }
                    break;
            }
        }
        return nextDate;
    }
    async getPlansForInvoicing() {
        const now = new Date();
        return this.prisma.companyPlan.findMany({
            where: {
                status: 'ACTIVE',
                autoInvoice: true,
                nextInvoiceDate: {
                    lte: now,
                },
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } },
                ],
            },
            include: this.planInclude,
        });
    }
    async generateInvoice(planId) {
        const plan = await this.prisma.companyPlan.findUnique({
            where: { id: planId },
            include: {
                company: true,
                currency: true,
                items: {
                    include: { product: true },
                },
            },
        });
        if (!plan) {
            throw new common_1.NotFoundException('Plan not found');
        }
        if (plan.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Can only generate invoices for active plans');
        }
        const adminCompany = await this.prisma.company.findFirst({
            where: { role: 'OWNER' },
        });
        if (!adminCompany) {
            throw new common_1.BadRequestException('Admin company not found');
        }
        const billingPeriodStart = plan.lastInvoiceDate || plan.startDate;
        const billingPeriodEnd = new Date(plan.nextInvoiceDate);
        billingPeriodEnd.setDate(billingPeriodEnd.getDate() - 1);
        const year = new Date().getFullYear();
        const prefix = `INV-${year}-`;
        const lastInvoice = await this.prisma.invoice.findFirst({
            where: {
                companyId: adminCompany.id,
                invoiceNumber: { startsWith: prefix },
            },
            orderBy: { invoiceNumber: 'desc' },
        });
        let nextNumber = 1;
        if (lastInvoice) {
            const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
            nextNumber = lastNumber + 1;
        }
        const invoiceNumber = `${prefix}${nextNumber.toString().padStart(5, '0')}`;
        let subtotal = 0;
        let vatAmount = 0;
        const invoiceItems = plan.items.map((item) => {
            const itemSubtotal = Number(item.quantity) * Number(item.unitPrice);
            const itemVat = itemSubtotal * (Number(item.vatRate) / 100);
            subtotal += itemSubtotal;
            vatAmount += itemVat;
            return {
                productId: item.productId,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                vatRate: item.vatRate,
                discount: 0,
                total: item.total,
            };
        });
        const total = subtotal + vatAmount;
        const invoice = await this.prisma.invoice.create({
            data: {
                invoiceNumber,
                invoiceDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                type: 'REGULAR',
                status: 'DRAFT',
                customerId: null,
                customerName: plan.company.name,
                customerEik: plan.company.eik,
                customerVatNumber: plan.company.vatNumber,
                customerAddress: plan.company.address,
                customerCity: plan.company.city,
                customerPostalCode: plan.company.postalCode,
                subtotal,
                vatAmount,
                discount: 0,
                total,
                currencyId: plan.currencyId,
                notes: plan.invoiceNotes,
                companyId: adminCompany.id,
                items: {
                    create: invoiceItems,
                },
            },
        });
        await this.prisma.companyPlanInvoice.create({
            data: {
                planId: plan.id,
                invoiceId: invoice.id,
                billingPeriodStart,
                billingPeriodEnd,
            },
        });
        const nextInvoiceDate = this.calculateNextInvoiceDate(plan.nextInvoiceDate, plan.billingCycle, plan.billingDayOfMonth);
        await this.prisma.companyPlan.update({
            where: { id: plan.id },
            data: {
                lastInvoiceDate: new Date(),
                nextInvoiceDate,
            },
        });
        return invoice;
    }
};
exports.CompanyPlansService = CompanyPlansService;
exports.CompanyPlansService = CompanyPlansService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CompanyPlansService);
//# sourceMappingURL=company-plans.service.js.map