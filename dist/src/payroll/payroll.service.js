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
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let PayrollService = class PayrollService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    calculateSalaries(data) {
        const grossSalary = data.baseSalary +
            (data.overtimePay || 0) +
            (data.bonuses || 0) +
            (data.allowances || 0) +
            (data.commissions || 0);
        const totalDeductions = (data.taxDeductions || 0) +
            (data.insuranceEmployee || 0) +
            (data.otherDeductions || 0);
        const netSalary = grossSalary - totalDeductions;
        return { grossSalary, netSalary };
    }
    async create(companyId, dto) {
        const userCompany = await this.prisma.userCompany.findFirst({
            where: { userId: dto.userId, companyId },
        });
        if (!userCompany) {
            throw new common_1.BadRequestException('User is not an employee of this company');
        }
        const existing = await this.prisma.payroll.findUnique({
            where: {
                companyId_userId_year_month: {
                    companyId,
                    userId: dto.userId,
                    year: dto.year,
                    month: dto.month,
                },
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Payroll record already exists for this period');
        }
        const { grossSalary, netSalary } = this.calculateSalaries(dto);
        const payroll = await this.prisma.payroll.create({
            data: {
                userId: dto.userId,
                year: dto.year,
                month: dto.month,
                baseSalary: dto.baseSalary,
                grossSalary,
                netSalary,
                overtimePay: dto.overtimePay || 0,
                bonuses: dto.bonuses || 0,
                allowances: dto.allowances || 0,
                commissions: dto.commissions || 0,
                taxDeductions: dto.taxDeductions || 0,
                insuranceEmployee: dto.insuranceEmployee || 0,
                insuranceEmployer: dto.insuranceEmployer || 0,
                otherDeductions: dto.otherDeductions || 0,
                workingDays: dto.workingDays || 0,
                workedDays: dto.workedDays || 0,
                sickLeaveDays: dto.sickLeaveDays || 0,
                vacationDays: dto.vacationDays || 0,
                unpaidLeaveDays: dto.unpaidLeaveDays || 0,
                notes: dto.notes,
                companyId,
                items: dto.items
                    ? {
                        create: dto.items.map((item) => ({
                            type: item.type,
                            description: item.description,
                            amount: item.amount,
                        })),
                    }
                    : undefined,
            },
            include: {
                items: true,
            },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });
        return { ...payroll, user };
    }
    async findAll(companyId, query) {
        const { userId, year, month, status, page = 1, limit = 50, sortBy = 'year', sortOrder = 'desc', } = query;
        const where = { companyId };
        if (userId) {
            where.userId = userId;
        }
        if (year) {
            where.year = year;
        }
        if (month) {
            where.month = month;
        }
        if (status) {
            where.status = status;
        }
        const [total, payrolls] = await Promise.all([
            this.prisma.payroll.count({ where }),
            this.prisma.payroll.findMany({
                where,
                include: {
                    items: true,
                },
                orderBy: sortBy === 'year'
                    ? [{ year: sortOrder }, { month: sortOrder }]
                    : { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
        const userIds = [...new Set(payrolls.map((p) => p.userId))];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });
        const usersMap = new Map(users.map((u) => [u.id, u]));
        const enrichedPayrolls = payrolls.map((p) => ({
            ...p,
            user: usersMap.get(p.userId) || null,
        }));
        return {
            data: enrichedPayrolls,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(companyId, id) {
        const payroll = await this.prisma.payroll.findFirst({
            where: { id, companyId },
            include: {
                items: true,
            },
        });
        if (!payroll) {
            throw new common_1.NotFoundException('Payroll record not found');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: payroll.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });
        let approvedBy = null;
        if (payroll.approvedById) {
            approvedBy = await this.prisma.user.findUnique({
                where: { id: payroll.approvedById },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            });
        }
        return { ...payroll, user, approvedBy };
    }
    async update(companyId, id, dto) {
        const payroll = await this.prisma.payroll.findFirst({
            where: { id, companyId },
        });
        if (!payroll) {
            throw new common_1.NotFoundException('Payroll record not found');
        }
        if (payroll.status !== client_1.PayrollStatus.DRAFT && dto.status === undefined) {
            throw new common_1.BadRequestException('Can only edit payrolls in DRAFT status');
        }
        let grossSalary = payroll.grossSalary;
        let netSalary = payroll.netSalary;
        if (dto.baseSalary !== undefined ||
            dto.overtimePay !== undefined ||
            dto.bonuses !== undefined ||
            dto.allowances !== undefined ||
            dto.commissions !== undefined ||
            dto.taxDeductions !== undefined ||
            dto.insuranceEmployee !== undefined ||
            dto.otherDeductions !== undefined) {
            const calculated = this.calculateSalaries({
                baseSalary: dto.baseSalary ?? Number(payroll.baseSalary),
                overtimePay: dto.overtimePay ?? Number(payroll.overtimePay),
                bonuses: dto.bonuses ?? Number(payroll.bonuses),
                allowances: dto.allowances ?? Number(payroll.allowances),
                commissions: dto.commissions ?? Number(payroll.commissions),
                taxDeductions: dto.taxDeductions ?? Number(payroll.taxDeductions),
                insuranceEmployee: dto.insuranceEmployee ?? Number(payroll.insuranceEmployee),
                otherDeductions: dto.otherDeductions ?? Number(payroll.otherDeductions),
            });
            grossSalary = calculated.grossSalary;
            netSalary = calculated.netSalary;
        }
        if (dto.items) {
            await this.prisma.payrollItem.deleteMany({
                where: { payrollId: id },
            });
            await this.prisma.payrollItem.createMany({
                data: dto.items.map((item) => ({
                    payrollId: id,
                    type: item.type,
                    description: item.description,
                    amount: item.amount,
                })),
            });
        }
        const updated = await this.prisma.payroll.update({
            where: { id },
            data: {
                baseSalary: dto.baseSalary,
                grossSalary,
                netSalary,
                overtimePay: dto.overtimePay,
                bonuses: dto.bonuses,
                allowances: dto.allowances,
                commissions: dto.commissions,
                taxDeductions: dto.taxDeductions,
                insuranceEmployee: dto.insuranceEmployee,
                insuranceEmployer: dto.insuranceEmployer,
                otherDeductions: dto.otherDeductions,
                workingDays: dto.workingDays,
                workedDays: dto.workedDays,
                sickLeaveDays: dto.sickLeaveDays,
                vacationDays: dto.vacationDays,
                unpaidLeaveDays: dto.unpaidLeaveDays,
                status: dto.status,
                notes: dto.notes,
            },
            include: {
                items: true,
            },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: updated.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
            },
        });
        return { ...updated, user };
    }
    async approve(companyId, id, approverId) {
        const payroll = await this.prisma.payroll.findFirst({
            where: { id, companyId },
        });
        if (!payroll) {
            throw new common_1.NotFoundException('Payroll record not found');
        }
        if (payroll.status !== client_1.PayrollStatus.DRAFT &&
            payroll.status !== client_1.PayrollStatus.PENDING) {
            throw new common_1.BadRequestException('Can only approve DRAFT or PENDING payrolls');
        }
        const updated = await this.prisma.payroll.update({
            where: { id },
            data: {
                status: client_1.PayrollStatus.APPROVED,
                approvedById: approverId,
                approvedAt: new Date(),
            },
        });
        return updated;
    }
    async markAsPaid(companyId, id, paymentReference) {
        const payroll = await this.prisma.payroll.findFirst({
            where: { id, companyId },
        });
        if (!payroll) {
            throw new common_1.NotFoundException('Payroll record not found');
        }
        if (payroll.status !== client_1.PayrollStatus.APPROVED) {
            throw new common_1.BadRequestException('Can only mark APPROVED payrolls as paid');
        }
        const updated = await this.prisma.payroll.update({
            where: { id },
            data: {
                status: client_1.PayrollStatus.PAID,
                paidAt: new Date(),
                paymentReference,
            },
        });
        return updated;
    }
    async cancel(companyId, id) {
        const payroll = await this.prisma.payroll.findFirst({
            where: { id, companyId },
        });
        if (!payroll) {
            throw new common_1.NotFoundException('Payroll record not found');
        }
        if (payroll.status === client_1.PayrollStatus.PAID) {
            throw new common_1.BadRequestException('Cannot cancel a paid payroll');
        }
        const updated = await this.prisma.payroll.update({
            where: { id },
            data: {
                status: client_1.PayrollStatus.CANCELLED,
            },
        });
        return updated;
    }
    async remove(companyId, id) {
        const payroll = await this.prisma.payroll.findFirst({
            where: { id, companyId },
        });
        if (!payroll) {
            throw new common_1.NotFoundException('Payroll record not found');
        }
        if (payroll.status !== client_1.PayrollStatus.DRAFT) {
            throw new common_1.BadRequestException('Can only delete DRAFT payrolls');
        }
        await this.prisma.payroll.delete({
            where: { id },
        });
        return { success: true, message: 'Payroll record deleted' };
    }
    async getSummary(companyId, year, month) {
        const where = { companyId, year };
        if (month) {
            where.month = month;
        }
        const payrolls = await this.prisma.payroll.findMany({
            where,
        });
        const summary = {
            totalRecords: payrolls.length,
            totalGrossSalary: 0,
            totalNetSalary: 0,
            totalTaxDeductions: 0,
            totalInsuranceEmployee: 0,
            totalInsuranceEmployer: 0,
            totalBonuses: 0,
            statusCounts: {
                DRAFT: 0,
                PENDING: 0,
                APPROVED: 0,
                PAID: 0,
                CANCELLED: 0,
            },
        };
        for (const p of payrolls) {
            summary.totalGrossSalary += Number(p.grossSalary);
            summary.totalNetSalary += Number(p.netSalary);
            summary.totalTaxDeductions += Number(p.taxDeductions);
            summary.totalInsuranceEmployee += Number(p.insuranceEmployee);
            summary.totalInsuranceEmployer += Number(p.insuranceEmployer);
            summary.totalBonuses += Number(p.bonuses);
            summary.statusCounts[p.status]++;
        }
        return summary;
    }
    async generateBulk(companyId, year, month, defaultBaseSalary) {
        const userCompanies = await this.prisma.userCompany.findMany({
            where: { companyId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        const created = [];
        const skipped = [];
        for (const uc of userCompanies) {
            const existing = await this.prisma.payroll.findUnique({
                where: {
                    companyId_userId_year_month: {
                        companyId,
                        userId: uc.userId,
                        year,
                        month,
                    },
                },
            });
            if (existing) {
                skipped.push({
                    userId: uc.userId,
                    userName: `${uc.user.firstName} ${uc.user.lastName}`,
                    reason: 'Already exists',
                });
                continue;
            }
            const { grossSalary, netSalary } = this.calculateSalaries({
                baseSalary: defaultBaseSalary,
            });
            const payroll = await this.prisma.payroll.create({
                data: {
                    userId: uc.userId,
                    year,
                    month,
                    baseSalary: defaultBaseSalary,
                    grossSalary,
                    netSalary,
                    companyId,
                },
            });
            created.push({
                id: payroll.id,
                userId: uc.userId,
                userName: `${uc.user.firstName} ${uc.user.lastName}`,
            });
        }
        return { created, skipped };
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map