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
exports.ErpAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const expenses_service_1 = require("../expenses/expenses.service");
let ErpAnalyticsService = class ErpAnalyticsService {
    prisma;
    expensesService;
    constructor(prisma, expensesService) {
        this.prisma = prisma;
        this.expensesService = expensesService;
    }
    async getProfitAnalytics(companyId, query) {
        const now = new Date();
        const dateFrom = query.dateFrom
            ? new Date(query.dateFrom)
            : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateTo = query.dateTo
            ? new Date(query.dateTo + 'T23:59:59.999Z')
            : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const periodLength = dateTo.getTime() - dateFrom.getTime();
        const previousFrom = new Date(dateFrom.getTime() - periodLength);
        const previousTo = new Date(dateFrom.getTime() - 1);
        const orderWhere = {
            companyId,
            orderDate: {
                gte: dateFrom,
                lte: dateTo,
            },
            status: {
                in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
            },
        };
        if (query.customerId) {
            orderWhere.customerId = query.customerId;
        }
        const orders = await this.prisma.order.findMany({
            where: orderWhere,
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            },
                        },
                        inventoryBatch: true,
                    },
                    ...(query.productId && {
                        where: { productId: query.productId },
                    }),
                },
            },
        });
        const productMap = new Map();
        let totalRevenue = 0;
        let totalCost = 0;
        let totalItemsSold = 0;
        for (const order of orders) {
            for (const item of order.items) {
                if (query.categoryId && item.product.categoryId !== query.categoryId) {
                    continue;
                }
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.unitPrice);
                const itemRevenue = quantity * unitPrice;
                let unitCost = 0;
                if (item.inventoryBatch) {
                    unitCost = Number(item.inventoryBatch.unitCost);
                }
                else if (item.product.purchasePrice) {
                    unitCost = Number(item.product.purchasePrice);
                }
                const itemCost = quantity * unitCost;
                totalRevenue += itemRevenue;
                totalCost += itemCost;
                totalItemsSold += quantity;
                const existing = productMap.get(item.productId);
                if (existing) {
                    existing.unitsSold += quantity;
                    existing.revenue += itemRevenue;
                    existing.cost += itemCost;
                }
                else {
                    productMap.set(item.productId, {
                        productId: item.productId,
                        productName: item.product.name,
                        productSku: item.product.sku || '',
                        categoryName: item.product.category?.name || null,
                        unitsSold: quantity,
                        revenue: itemRevenue,
                        cost: itemCost,
                        profit: 0,
                        profitMargin: 0,
                        avgSellingPrice: 0,
                        avgCostPrice: 0,
                    });
                }
            }
        }
        const byProduct = [];
        for (const [, data] of productMap) {
            data.profit = data.revenue - data.cost;
            data.profitMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
            data.avgSellingPrice = data.unitsSold > 0 ? data.revenue / data.unitsSold : 0;
            data.avgCostPrice = data.unitsSold > 0 ? data.cost / data.unitsSold : 0;
            byProduct.push(data);
        }
        byProduct.sort((a, b) => b.profit - a.profit);
        const categoryMap = new Map();
        for (const product of byProduct) {
            const catKey = product.categoryName || 'uncategorized';
            const existing = categoryMap.get(catKey);
            if (existing) {
                existing.revenue += product.revenue;
                existing.cost += product.cost;
            }
            else {
                categoryMap.set(catKey, {
                    categoryId: null,
                    categoryName: product.categoryName || 'Без категория',
                    revenue: product.revenue,
                    cost: product.cost,
                });
            }
        }
        const byCategory = Array.from(categoryMap.values()).map(cat => ({
            ...cat,
            profit: cat.revenue - cat.cost,
            profitMargin: cat.revenue > 0 ? ((cat.revenue - cat.cost) / cat.revenue) * 100 : 0,
        })).sort((a, b) => b.profit - a.profit);
        const grossProfit = totalRevenue - totalCost;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const previousOrders = await this.prisma.order.findMany({
            where: {
                companyId,
                orderDate: {
                    gte: previousFrom,
                    lte: previousTo,
                },
                status: {
                    in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
                },
            },
            include: {
                items: {
                    include: {
                        inventoryBatch: true,
                        product: true,
                    },
                },
            },
        });
        let previousRevenue = 0;
        let previousCost = 0;
        for (const order of previousOrders) {
            for (const item of order.items) {
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.unitPrice);
                previousRevenue += quantity * unitPrice;
                let unitCost = 0;
                if (item.inventoryBatch) {
                    unitCost = Number(item.inventoryBatch.unitCost);
                }
                else if (item.product.purchasePrice) {
                    unitCost = Number(item.product.purchasePrice);
                }
                previousCost += quantity * unitCost;
            }
        }
        const previousProfit = previousRevenue - previousCost;
        const revenueGrowth = previousRevenue > 0
            ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
            : totalRevenue > 0 ? 100 : 0;
        const profitGrowth = previousProfit > 0
            ? ((grossProfit - previousProfit) / previousProfit) * 100
            : grossProfit > 0 ? 100 : 0;
        return {
            summary: {
                totalRevenue,
                totalCost,
                grossProfit,
                profitMargin,
                orderCount: orders.length,
                itemsSold: totalItemsSold,
            },
            byProduct,
            byCategory,
            periodComparison: {
                previousRevenue,
                previousCost,
                previousProfit,
                revenueGrowth,
                profitGrowth,
            },
        };
    }
    async getPurchaseSummary(companyId, query) {
        const now = new Date();
        const dateFrom = query.dateFrom
            ? new Date(query.dateFrom)
            : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateTo = query.dateTo
            ? new Date(query.dateTo + 'T23:59:59.999Z')
            : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const receiptWhere = {
            companyId,
            receiptDate: {
                gte: dateFrom,
                lte: dateTo,
            },
            status: 'COMPLETED',
        };
        if (query.supplierId) {
            receiptWhere.supplierId = query.supplierId;
        }
        const receipts = await this.prisma.goodsReceipt.findMany({
            where: receiptWhere,
            include: {
                supplier: true,
                items: {
                    include: {
                        product: {
                            include: {
                                category: true,
                            },
                        },
                    },
                    ...(query.productId && {
                        where: { productId: query.productId },
                    }),
                },
            },
        });
        const productPurchases = new Map();
        let totalPurchaseCost = 0;
        let totalUnitsPurchased = 0;
        for (const receipt of receipts) {
            for (const item of receipt.items) {
                if (query.categoryId && item.product.categoryId !== query.categoryId) {
                    continue;
                }
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.unitPrice);
                const exchangeRate = Number(item.exchangeRate) || 1;
                const itemCost = quantity * unitPrice * exchangeRate;
                totalPurchaseCost += itemCost;
                totalUnitsPurchased += quantity;
                const existing = productPurchases.get(item.productId);
                if (existing) {
                    existing.unitsPurchased += quantity;
                    existing.totalCost += itemCost;
                }
                else {
                    productPurchases.set(item.productId, {
                        productId: item.productId,
                        productName: item.product.name,
                        productSku: item.product.sku || '',
                        categoryName: item.product.category?.name || null,
                        unitsPurchased: quantity,
                        totalCost: itemCost,
                        avgCostPrice: 0,
                    });
                }
            }
        }
        const byProduct = Array.from(productPurchases.values()).map(p => ({
            ...p,
            avgCostPrice: p.unitsPurchased > 0 ? p.totalCost / p.unitsPurchased : 0,
        })).sort((a, b) => b.totalCost - a.totalCost);
        const supplierMap = new Map();
        for (const receipt of receipts) {
            let receiptTotal = 0;
            for (const item of receipt.items) {
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.unitPrice);
                const exchangeRate = Number(item.exchangeRate) || 1;
                receiptTotal += quantity * unitPrice * exchangeRate;
            }
            const supplierKey = receipt.supplierId || 'unknown';
            const existing = supplierMap.get(supplierKey);
            if (existing) {
                existing.totalCost += receiptTotal;
                existing.receiptCount += 1;
            }
            else {
                supplierMap.set(supplierKey, {
                    supplierId: receipt.supplierId,
                    supplierName: receipt.supplier?.name || 'Неизвестен доставчик',
                    totalCost: receiptTotal,
                    receiptCount: 1,
                });
            }
        }
        const bySupplier = Array.from(supplierMap.values())
            .sort((a, b) => b.totalCost - a.totalCost);
        return {
            summary: {
                totalPurchaseCost,
                totalUnitsPurchased,
                receiptCount: receipts.length,
            },
            byProduct,
            bySupplier,
        };
    }
    async getPayrollSummary(companyId, dateFrom, dateTo) {
        const startYear = dateFrom.getFullYear();
        const startMonth = dateFrom.getMonth() + 1;
        const endYear = dateTo.getFullYear();
        const endMonth = dateTo.getMonth() + 1;
        const payrolls = await this.prisma.payroll.findMany({
            where: {
                companyId,
                status: { in: ['APPROVED', 'PAID'] },
                OR: [
                    {
                        year: startYear,
                        month: { gte: startMonth, lte: startYear === endYear ? endMonth : 12 },
                    },
                    ...(startYear !== endYear
                        ? [
                            {
                                year: { gt: startYear, lt: endYear },
                            },
                            {
                                year: endYear,
                                month: { lte: endMonth },
                            },
                        ]
                        : []),
                ],
            },
        });
        let totalSalaries = 0;
        let totalInsurance = 0;
        const employeeIds = new Set();
        for (const payroll of payrolls) {
            totalSalaries += Number(payroll.grossSalary);
            totalInsurance += Number(payroll.insuranceEmployer);
            employeeIds.add(payroll.userId);
        }
        return {
            totalSalaries,
            totalInsurance,
            employeeCount: employeeIds.size,
        };
    }
    async getFinancialSummary(companyId, query) {
        const now = new Date();
        const dateFrom = query.dateFrom
            ? new Date(query.dateFrom)
            : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateTo = query.dateTo
            ? new Date(query.dateTo + 'T23:59:59.999Z')
            : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const [profitData, purchaseData, expensesSummary, payrollSummary] = await Promise.all([
            this.getProfitAnalytics(companyId, query),
            this.getPurchaseSummary(companyId, query),
            this.expensesService.getExpensesSummary(companyId, dateFrom, dateTo),
            this.getPayrollSummary(companyId, dateFrom, dateTo),
        ]);
        const totalOperatingExpenses = expensesSummary.totalExpenses +
            payrollSummary.totalSalaries +
            payrollSummary.totalInsurance;
        const netProfit = profitData.summary.grossProfit - totalOperatingExpenses;
        const netMargin = profitData.summary.totalRevenue > 0
            ? (netProfit / profitData.summary.totalRevenue) * 100
            : 0;
        return {
            revenue: profitData.summary.totalRevenue,
            orderCount: profitData.summary.orderCount,
            itemsSold: profitData.summary.itemsSold,
            costOfGoodsSold: profitData.summary.totalCost,
            grossProfit: profitData.summary.grossProfit,
            grossMargin: profitData.summary.profitMargin,
            expenses: expensesSummary,
            payroll: payrollSummary,
            totalOperatingExpenses,
            netProfit,
            netMargin,
            totalPurchases: purchaseData.summary.totalPurchaseCost,
            itemsPurchased: purchaseData.summary.totalUnitsPurchased,
            periodComparison: profitData.periodComparison,
            topProducts: profitData.byProduct.slice(0, 10),
            topCategories: profitData.byCategory.slice(0, 5),
            topSuppliers: purchaseData.bySupplier.slice(0, 5),
        };
    }
};
exports.ErpAnalyticsService = ErpAnalyticsService;
exports.ErpAnalyticsService = ErpAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        expenses_service_1.ExpensesService])
], ErpAnalyticsService);
//# sourceMappingURL=erp-analytics.service.js.map