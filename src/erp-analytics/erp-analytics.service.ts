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

// ==================== Sales Report ====================

export interface SalesReportResult {
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  periodComparison?: {
    previousRevenue: number;
    previousOrderCount: number;
    previousAvgOrderValue: number;
    revenueGrowth: number;
    orderGrowth: number;
    avgOrderValueGrowth: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantitySold: number;
    revenue: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    orderCount: number;
    totalSpent: number;
  }>;
  trend: Array<{ date: string; revenue: number; orderCount: number }>;
}

// ==================== Customers Report ====================

export interface CustomersReportResult {
  totalCustomers: number;
  newCustomers: number;
  avgOrderValue: number;
  totalOrders: number;
  periodComparison?: {
    previousNewCustomers: number;
    previousTotalOrders: number;
    newCustomersGrowth: number;
    ordersGrowth: number;
  };
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    orderCount: number;
    avgOrderValue: number;
    totalSpent: number;
  }>;
  newCustomersTrend: Array<{ date: string; count: number }>;
}

// ==================== Products Report ====================

export interface ProductsReportResult {
  totalProducts: number;
  lowStockCount: number;
  noMovementCount: number;
  totalInventoryValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantitySold: number;
    revenue: number;
    currentStock: number;
  }>;
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    productSku: string;
    currentStock: number;
    minStockLevel: number;
  }>;
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
      : new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
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

    // Fetch orders with items and inventory batch/serial info
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
            inventorySerial: true,
          },
          ...(query.productId && {
            where: { productId: query.productId },
          }),
        },
      },
    });

    // Pre-load weighted average cost per product from goods receipts
    // This handles cases where order items don't have a direct inventoryBatchId (FIFO deduction)
    const productIds = new Set<string>();
    for (const order of orders) {
      for (const item of order.items) {
        productIds.add(item.productId);
      }
    }

    const avgCostMap = new Map<string, number>();
    if (productIds.size > 0) {
      // Calculate weighted average cost from delivered goods receipt items
      const receiptItems = await this.prisma.goodsReceiptItem.findMany({
        where: {
          productId: { in: Array.from(productIds) },
          goodsReceipt: {
            companyId,
            status: { in: ['DELIVERED_PAID', 'DELIVERED_UNPAID'] },
          },
        },
        select: {
          productId: true,
          quantity: true,
          unitPrice: true,
          exchangeRate: true,
        },
      });

      // Group by product and calculate weighted average
      const productCosts = new Map<string, { totalCost: number; totalQty: number }>();
      for (const ri of receiptItems) {
        const qty = Number(ri.quantity);
        const cost = qty * Number(ri.unitPrice) * (Number(ri.exchangeRate) || 1);
        const existing = productCosts.get(ri.productId);
        if (existing) {
          existing.totalCost += cost;
          existing.totalQty += qty;
        } else {
          productCosts.set(ri.productId, { totalCost: cost, totalQty: qty });
        }
      }

      for (const [productId, { totalCost: tc, totalQty: tq }] of productCosts) {
        if (tq > 0) {
          avgCostMap.set(productId, tc / tq);
        }
      }
    }

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

        // Get cost: 1) linked batch, 2) linked serial, 3) weighted avg from goods receipts, 4) product purchasePrice
        let unitCost = 0;
        if (item.inventoryBatch) {
          unitCost = Number(item.inventoryBatch.unitCost);
        } else if ((item as any).inventorySerial) {
          unitCost = Number((item as any).inventorySerial.unitCost);
        } else if (avgCostMap.has(item.productId)) {
          unitCost = avgCostMap.get(item.productId)!;
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
            inventorySerial: true,
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
        } else if (item.inventorySerial) {
          unitCost = Number(item.inventorySerial.unitCost);
        } else if (avgCostMap.has(item.productId)) {
          unitCost = avgCostMap.get(item.productId)!;
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
      : new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const dateTo = query.dateTo
      ? new Date(query.dateTo + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const receiptWhere: any = {
      companyId,
      receiptDate: {
        gte: dateFrom,
        lte: dateTo,
      },
      status: { in: ['DELIVERED_PAID', 'DELIVERED_UNPAID'] },
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
      : new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
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

  // ==================== Sales Report ====================
  async getSalesReport(
    companyId: string,
    query: QueryProfitAnalyticsDto,
  ): Promise<SalesReportResult> {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const dateTo = query.dateTo
      ? new Date(query.dateTo + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const periodLength = dateTo.getTime() - dateFrom.getTime();
    const previousFrom = new Date(dateFrom.getTime() - periodLength);
    const previousTo = new Date(dateFrom.getTime() - 1);

    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        orderDate: { gte: dateFrom, lte: dateTo },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Calculate totals
    let revenue = 0;
    const productMap = new Map<string, { productId: string; productName: string; productSku: string; quantitySold: number; revenue: number }>();
    const customerMap = new Map<string, { customerId: string; customerName: string; orderCount: number; totalSpent: number }>();
    const trendMap = new Map<string, { revenue: number; orderCount: number }>();

    for (const order of orders) {
      let orderTotal = 0;
      for (const item of order.items) {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        const itemRevenue = qty * price;
        orderTotal += itemRevenue;

        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantitySold += qty;
          existing.revenue += itemRevenue;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku || '',
            quantitySold: qty,
            revenue: itemRevenue,
          });
        }
      }
      revenue += orderTotal;

      // Customer aggregation (customerName is on the Order itself)
      if (order.customerId) {
        const cust = customerMap.get(order.customerId);
        if (cust) {
          cust.orderCount += 1;
          cust.totalSpent += orderTotal;
        } else {
          customerMap.set(order.customerId, {
            customerId: order.customerId,
            customerName: order.customerName,
            orderCount: 1,
            totalSpent: orderTotal,
          });
        }
      }

      // Monthly trend
      const monthKey = order.orderDate.toISOString().slice(0, 7); // YYYY-MM
      const trend = trendMap.get(monthKey);
      if (trend) {
        trend.revenue += orderTotal;
        trend.orderCount += 1;
      } else {
        trendMap.set(monthKey, { revenue: orderTotal, orderCount: 1 });
      }
    }

    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    // Previous period
    const previousOrders = await this.prisma.order.findMany({
      where: {
        companyId,
        orderDate: { gte: previousFrom, lte: previousTo },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      include: { items: true },
    });

    let previousRevenue = 0;
    for (const order of previousOrders) {
      for (const item of order.items) {
        previousRevenue += Number(item.quantity) * Number(item.unitPrice);
      }
    }
    const previousOrderCount = previousOrders.length;
    const previousAvgOrderValue = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

    const calcGrowth = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    return {
      revenue,
      orderCount,
      avgOrderValue,
      periodComparison: {
        previousRevenue,
        previousOrderCount,
        previousAvgOrderValue,
        revenueGrowth: calcGrowth(revenue, previousRevenue),
        orderGrowth: calcGrowth(orderCount, previousOrderCount),
        avgOrderValueGrowth: calcGrowth(avgOrderValue, previousAvgOrderValue),
      },
      topProducts: Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      topCustomers: Array.from(customerMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10),
      trend: Array.from(trendMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ==================== Customers Report ====================
  async getCustomersReport(
    companyId: string,
    query: QueryProfitAnalyticsDto,
  ): Promise<CustomersReportResult> {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = query.dateTo
      ? new Date(query.dateTo + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const periodLength = dateTo.getTime() - dateFrom.getTime();
    const previousFrom = new Date(dateFrom.getTime() - periodLength);
    const previousTo = new Date(dateFrom.getTime() - 1);

    // Fetch orders in period
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        orderDate: { gte: dateFrom, lte: dateTo },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      include: {
        items: true,
      },
    });

    // Customer aggregation
    const customerMap = new Map<string, {
      customerId: string; customerName: string;
      orderCount: number; totalSpent: number;
      firstOrderDate: Date;
    }>();

    for (const order of orders) {
      if (!order.customerId) continue;

      let orderTotal = 0;
      for (const item of order.items) {
        orderTotal += Number(item.quantity) * Number(item.unitPrice);
      }

      const existing = customerMap.get(order.customerId);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += orderTotal;
        if (order.orderDate < existing.firstOrderDate) {
          existing.firstOrderDate = order.orderDate;
        }
      } else {
        customerMap.set(order.customerId, {
          customerId: order.customerId,
          customerName: order.customerName,
          orderCount: 1,
          totalSpent: orderTotal,
          firstOrderDate: order.orderDate,
        });
      }
    }

    const totalCustomers = customerMap.size;
    const totalOrders = orders.length;
    const totalRevenue = Array.from(customerMap.values()).reduce((sum, c) => sum + c.totalSpent, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Find "new" customers — customers whose first-ever order is in this period
    const newCustomerIds: string[] = [];
    for (const [customerId] of customerMap) {
      const earlierOrder = await this.prisma.order.findFirst({
        where: {
          companyId,
          customerId,
          orderDate: { lt: dateFrom },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        select: { id: true },
      });
      if (!earlierOrder) {
        newCustomerIds.push(customerId);
      }
    }
    const newCustomers = newCustomerIds.length;

    // New customers per month trend
    const newCustomerMonthMap = new Map<string, Set<string>>();
    for (const order of orders) {
      if (!order.customerId || !newCustomerIds.includes(order.customerId)) continue;
      const monthKey = order.orderDate.toISOString().slice(0, 7);
      if (!newCustomerMonthMap.has(monthKey)) {
        newCustomerMonthMap.set(monthKey, new Set());
      }
      newCustomerMonthMap.get(monthKey)!.add(order.customerId);
    }

    // Previous period for comparison
    const previousOrders = await this.prisma.order.findMany({
      where: {
        companyId,
        orderDate: { gte: previousFrom, lte: previousTo },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      select: { id: true, customerId: true, orderDate: true },
    });

    const previousCustomerIds = new Set(previousOrders.filter(o => o.customerId).map(o => o.customerId!));
    let previousNewCustomers = 0;
    for (const customerId of previousCustomerIds) {
      const earlierOrder = await this.prisma.order.findFirst({
        where: {
          companyId,
          customerId,
          orderDate: { lt: previousFrom },
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
        select: { id: true },
      });
      if (!earlierOrder) previousNewCustomers++;
    }

    const calcGrowth = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    return {
      totalCustomers,
      newCustomers,
      avgOrderValue,
      totalOrders,
      periodComparison: {
        previousNewCustomers,
        previousTotalOrders: previousOrders.length,
        newCustomersGrowth: calcGrowth(newCustomers, previousNewCustomers),
        ordersGrowth: calcGrowth(totalOrders, previousOrders.length),
      },
      topCustomers: Array.from(customerMap.values())
        .map(c => ({
          customerId: c.customerId,
          customerName: c.customerName,
          orderCount: c.orderCount,
          avgOrderValue: c.orderCount > 0 ? c.totalSpent / c.orderCount : 0,
          totalSpent: c.totalSpent,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10),
      newCustomersTrend: Array.from(newCustomerMonthMap.entries())
        .map(([date, ids]) => ({ date, count: ids.size }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ==================== Products Report ====================
  async getProductsReport(
    companyId: string,
    query: QueryProfitAnalyticsDto,
  ): Promise<ProductsReportResult> {
    const now = new Date();
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const dateTo = query.dateTo
      ? new Date(query.dateTo + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // All active products
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true },
      include: {
        inventoryBatches: {
          select: { quantity: true, unitCost: true },
        },
        inventorySerials: {
          where: { status: 'IN_STOCK' },
          select: { unitCost: true },
        },
      },
    });

    const totalProducts = products.length;

    // Calculate inventory values and stock levels per product
    const productStockMap = new Map<string, { currentStock: number; inventoryValue: number; minStock: number }>();
    let totalInventoryValue = 0;
    let lowStockCount = 0;

    for (const product of products) {
      let currentStock = 0;
      let inventoryValue = 0;

      if (product.type === 'SERIAL') {
        // SERIAL products: count inventory serials with IN_STOCK status
        currentStock = product.inventorySerials.length;
        for (const serial of product.inventorySerials) {
          inventoryValue += Number(serial.unitCost);
        }
      } else {
        // PRODUCT, BATCH: sum inventory batch quantities
        for (const batch of product.inventoryBatches) {
          const qty = Number(batch.quantity);
          currentStock += qty;
          inventoryValue += qty * Number(batch.unitCost);
        }
      }

      totalInventoryValue += inventoryValue;

      const minStock = Number(product.minStock) || 0;
      productStockMap.set(product.id, { currentStock, inventoryValue, minStock });

      if (minStock > 0 && currentStock < minStock) {
        lowStockCount++;
      }
    }

    // Orders in period — for sales data
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        orderDate: { gte: dateFrom, lte: dateTo },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      include: {
        items: { include: { product: true } },
      },
    });

    // Product sales aggregation
    const salesMap = new Map<string, { productId: string; productName: string; productSku: string; quantitySold: number; revenue: number }>();
    const soldProductIds = new Set<string>();

    for (const order of orders) {
      for (const item of order.items) {
        soldProductIds.add(item.productId);
        const qty = Number(item.quantity);
        const itemRevenue = qty * Number(item.unitPrice);
        const existing = salesMap.get(item.productId);
        if (existing) {
          existing.quantitySold += qty;
          existing.revenue += itemRevenue;
        } else {
          salesMap.set(item.productId, {
            productId: item.productId,
            productName: item.product.name,
            productSku: item.product.sku || '',
            quantitySold: qty,
            revenue: itemRevenue,
          });
        }
      }
    }

    // No movement: products with no sales in last 90 days
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recentSoldProductIds = new Set<string>();

    const recentOrders = await this.prisma.order.findMany({
      where: {
        companyId,
        orderDate: { gte: ninetyDaysAgo },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      include: { items: { select: { productId: true } } },
    });
    for (const order of recentOrders) {
      for (const item of order.items) {
        recentSoldProductIds.add(item.productId);
      }
    }

    let noMovementCount = 0;
    for (const product of products) {
      if (product.trackInventory && !recentSoldProductIds.has(product.id)) {
        const stock = productStockMap.get(product.id);
        if (stock && stock.currentStock > 0) {
          noMovementCount++;
        }
      }
    }

    // Top products with current stock
    const topProducts = Array.from(salesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({
        ...p,
        currentStock: productStockMap.get(p.productId)?.currentStock || 0,
      }));

    // Low stock products list
    const lowStockProducts = products
      .filter(p => {
        const minStock = Number(p.minStock) || 0;
        if (minStock <= 0) return false;
        const stock = productStockMap.get(p.id);
        return stock && stock.currentStock < minStock;
      })
      .map(p => {
        const stock = productStockMap.get(p.id)!;
        return {
          productId: p.id,
          productName: p.name,
          productSku: p.sku || '',
          currentStock: stock.currentStock,
          minStockLevel: stock.minStock,
        };
      })
      .sort((a, b) => (a.currentStock / a.minStockLevel) - (b.currentStock / b.minStockLevel));

    return {
      totalProducts,
      lowStockCount,
      noMovementCount,
      totalInventoryValue,
      topProducts,
      lowStockProducts,
    };
  }
}
