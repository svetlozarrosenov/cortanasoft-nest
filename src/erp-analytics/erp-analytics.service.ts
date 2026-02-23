import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProfitAnalyticsDto } from './dto';
import { ExpensesService } from '../expenses/expenses.service';

export interface ProductProfitData {
  productId: string;
  productName: string;
  productSku: string;
  categoryName: string | null;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  avgSellingPrice: number;
  avgCostPrice: number;
}

export interface CategoryProfitData {
  categoryId: string | null;
  categoryName: string;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

export interface PeriodComparison {
  previousRevenue: number;
  previousCost: number;
  previousProfit: number;
  revenueGrowth: number;
  profitGrowth: number;
}

export interface ProfitAnalyticsResult {
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    profitMargin: number;
    orderCount: number;
    itemsSold: number;
  };
  byProduct: ProductProfitData[];
  byCategory: CategoryProfitData[];
  periodComparison?: PeriodComparison;
}

export interface ProductPurchaseData {
  productId: string;
  productName: string;
  productSku: string;
  categoryName: string | null;
  unitsPurchased: number;
  totalCost: number;
  avgCostPrice: number;
}

export interface SupplierPurchaseData {
  supplierId: string | null;
  supplierName: string;
  totalCost: number;
  receiptCount: number;
}

export interface PurchaseSummaryResult {
  summary: {
    totalPurchaseCost: number;
    totalUnitsPurchased: number;
    receiptCount: number;
  };
  byProduct: ProductPurchaseData[];
  bySupplier: SupplierPurchaseData[];
}

export interface ExpenseCategoryData {
  category: string;
  amount: number;
}

export interface ExpensesSummary {
  totalExpenses: number;
  expenseCount: number;
  byCategory: ExpenseCategoryData[];
}

export interface PayrollSummary {
  totalSalaries: number;
  totalInsurance: number;
  employeeCount: number;
}

export interface FinancialSummaryResult {
  // Приходи
  revenue: number;
  orderCount: number;
  itemsSold: number;

  // Себестойност на продадени стоки
  costOfGoodsSold: number;

  // Брутна печалба
  grossProfit: number;
  grossMargin: number;

  // Оперативни разходи
  expenses: ExpensesSummary;
  payroll: PayrollSummary;
  totalOperatingExpenses: number;

  // Нетна печалба
  netProfit: number;
  netMargin: number;

  // Допълнителни данни
  totalPurchases: number;
  itemsPurchased: number;
  periodComparison?: PeriodComparison;
  topProducts: ProductProfitData[];
  topCategories: CategoryProfitData[];
  topSuppliers: SupplierPurchaseData[];
}

@Injectable()
export class ErpAnalyticsService {
  constructor(
    private prisma: PrismaService,
    private expensesService: ExpensesService,
  ) {}

  async getProfitAnalytics(
    companyId: string,
    query: QueryProfitAnalyticsDto,
  ): Promise<ProfitAnalyticsResult> {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today start
    const dateTo = query.dateTo
      ? new Date(query.dateTo + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // Today end

    // Calculate previous period for comparison
    const periodLength = dateTo.getTime() - dateFrom.getTime();
    const previousFrom = new Date(dateFrom.getTime() - periodLength);
    const previousTo = new Date(dateFrom.getTime() - 1);

    // Build where clause for orders
    const orderWhere: any = {
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

    // Fetch orders with items and inventory batch info
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

    // Calculate product-level profits
    const productMap = new Map<string, ProductProfitData>();

    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsSold = 0;

    for (const order of orders) {
      for (const item of order.items) {
        // Filter by category if specified
        if (query.categoryId && item.product.categoryId !== query.categoryId) {
          continue;
        }

        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        const itemRevenue = quantity * unitPrice;

        // Get cost from inventory batch if available, otherwise use product's purchase price
        let unitCost = 0;
        if (item.inventoryBatch) {
          unitCost = Number(item.inventoryBatch.unitCost);
        } else if (item.product.purchasePrice) {
          unitCost = Number(item.product.purchasePrice);
        }
        const itemCost = quantity * unitCost;

        totalRevenue += itemRevenue;
        totalCost += itemCost;
        totalItemsSold += quantity;

        // Aggregate by product
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.unitsSold += quantity;
          existing.revenue += itemRevenue;
          existing.cost += itemCost;
        } else {
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

    // Calculate final metrics for each product
    const byProduct: ProductProfitData[] = [];
    for (const [, data] of productMap) {
      data.profit = data.revenue - data.cost;
      data.profitMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
      data.avgSellingPrice = data.unitsSold > 0 ? data.revenue / data.unitsSold : 0;
      data.avgCostPrice = data.unitsSold > 0 ? data.cost / data.unitsSold : 0;
      byProduct.push(data);
    }

    // Sort by profit descending
    byProduct.sort((a, b) => b.profit - a.profit);

    // Aggregate by category
    const categoryMap = new Map<string, {
      categoryId: string | null;
      categoryName: string;
      revenue: number;
      cost: number;
    }>();

    for (const product of byProduct) {
      const catKey = product.categoryName || 'uncategorized';
      const existing = categoryMap.get(catKey);
      if (existing) {
        existing.revenue += product.revenue;
        existing.cost += product.cost;
      } else {
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

    // Calculate gross profit
    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Fetch previous period for comparison
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
        } else if (item.product.purchasePrice) {
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

  // Get purchase costs summary (goods received)
  async getPurchaseSummary(
    companyId: string,
    query: QueryProfitAnalyticsDto,
  ): Promise<PurchaseSummaryResult> {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateTo = query.dateTo
      ? new Date(query.dateTo + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const receiptWhere: any = {
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

    // Calculate totals
    const productPurchases = new Map<string, {
      productId: string;
      productName: string;
      productSku: string;
      categoryName: string | null;
      unitsPurchased: number;
      totalCost: number;
      avgCostPrice: number;
    }>();

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
        } else {
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

    // Calculate averages
    const byProduct = Array.from(productPurchases.values()).map(p => ({
      ...p,
      avgCostPrice: p.unitsPurchased > 0 ? p.totalCost / p.unitsPurchased : 0,
    })).sort((a, b) => b.totalCost - a.totalCost);

    // By supplier
    const supplierMap = new Map<string, {
      supplierId: string | null;
      supplierName: string;
      totalCost: number;
      receiptCount: number;
    }>();

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
      } else {
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

  // Get payroll summary for a period
  private async getPayrollSummary(
    companyId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<PayrollSummary> {
    // Изчисляваме месеците в периода
    const startYear = dateFrom.getFullYear();
    const startMonth = dateFrom.getMonth() + 1;
    const endYear = dateTo.getFullYear();
    const endMonth = dateTo.getMonth() + 1;

    const payrolls = await this.prisma.payroll.findMany({
      where: {
        companyId,
        status: { in: ['APPROVED', 'PAID'] },
        OR: [
          // Заплати в рамките на периода
          {
            year: startYear,
            month: { gte: startMonth, lte: startYear === endYear ? endMonth : 12 },
          },
          // Ако периода обхваща две години
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
    const employeeIds = new Set<string>();

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

  // Get overall financial summary (P&L like)
  async getFinancialSummary(
    companyId: string,
    query: QueryProfitAnalyticsDto,
  ): Promise<FinancialSummaryResult> {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateTo = query.dateTo
      ? new Date(query.dateTo + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [profitData, purchaseData, expensesSummary, payrollSummary] =
      await Promise.all([
        this.getProfitAnalytics(companyId, query),
        this.getPurchaseSummary(companyId, query),
        this.expensesService.getExpensesSummary(companyId, dateFrom, dateTo),
        this.getPayrollSummary(companyId, dateFrom, dateTo),
      ]);

    // Изчисляване на оперативни разходи
    const totalOperatingExpenses =
      expensesSummary.totalExpenses +
      payrollSummary.totalSalaries +
      payrollSummary.totalInsurance;

    // Изчисляване на нетна печалба
    const netProfit = profitData.summary.grossProfit - totalOperatingExpenses;
    const netMargin =
      profitData.summary.totalRevenue > 0
        ? (netProfit / profitData.summary.totalRevenue) * 100
        : 0;

    return {
      // Приходи
      revenue: profitData.summary.totalRevenue,
      orderCount: profitData.summary.orderCount,
      itemsSold: profitData.summary.itemsSold,

      // Себестойност
      costOfGoodsSold: profitData.summary.totalCost,

      // Брутна печалба
      grossProfit: profitData.summary.grossProfit,
      grossMargin: profitData.summary.profitMargin,

      // Оперативни разходи
      expenses: expensesSummary,
      payroll: payrollSummary,
      totalOperatingExpenses,

      // Нетна печалба
      netProfit,
      netMargin,

      // Допълнителни данни
      totalPurchases: purchaseData.summary.totalPurchaseCost,
      itemsPurchased: purchaseData.summary.totalUnitsPurchased,
      periodComparison: profitData.periodComparison,
      topProducts: profitData.byProduct.slice(0, 10),
      topCategories: profitData.byCategory.slice(0, 5),
      topSuppliers: purchaseData.bySupplier.slice(0, 5),
    };
  }
}
