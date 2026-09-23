import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { QueryProfitAnalyticsDto, QueryCustomerReceivablesDto } from './dto';
import { ExpensesService } from '../expenses/expenses.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

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
    /** Приходи без ДДС, след отстъпки (данъчна основа на продажбите) */
    totalRevenue: number;
    /** Σ Order.total (с ДДС и доставка) — само за коефициента на събираемост */
    totalGross: number;
    /** Реално получени пари (с ДДС) */
    totalPaid: number;
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

/** Ред от групирания отчет „Продажби" (по продукт / клиент / месец / обект) */
export interface SalesGroupRow {
  key: string;
  name: string;
  /** Втори ред под името — SKU, брой поръчки и т.н. */
  sub?: string;
  quantity: number;
  orderCount: number;
  /** Приход без ДДС, след отстъпки */
  revenue: number;
  /** Себестойност от доставките */
  cost: number;
  profit: number;
  /** Марж % от прихода */
  margin: number;
}

export type SalesGroupBy = 'product' | 'customer' | 'month' | 'site';

export interface SalesReportResult {
  revenue: number;
  paid: number;
  cost: number;
  grossProfit: number;
  grossMargin: number;
  orderCount: number;
  itemsSold: number;
  avgOrderValue: number;
  periodComparison?: {
    previousRevenue: number;
    previousPaid: number;
    previousCost: number;
    previousProfit: number;
    previousOrderCount: number;
    previousAvgOrderValue: number;
    revenueGrowth: number;
    paidGrowth: number;
    profitGrowth: number;
    orderGrowth: number;
    avgOrderValueGrowth: number;
  };
  byProduct: SalesGroupRow[];
  byCustomer: SalesGroupRow[];
  byMonth: SalesGroupRow[];
  bySite: SalesGroupRow[];
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
  trend: Array<{ date: string; revenue: number; cost: number; profit: number; orderCount: number }>;
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

// ==================== Customer Receivables ====================

export interface CustomerReceivableRow {
  customerId: string;
  customerName: string;
  unpaidOrders: number;
  oldestUnpaidDate: string | null;
  ordersTotal: number;
  paidTotal: number;
  due: number;
}

export interface CustomerReceivablesResult {
  data: CustomerReceivableRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  // Общо дължимо към фирмата от всички клиенти (без филтъра по име)
  totalDue: number;
  customersWithDue: number;
}

export interface CustomerReceivableOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  paymentStatus: string;
  total: number;
  paidAmount: number;
  due: number;
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
  paid: number; // Реално събрани пари (cash-basis) за същите поръчки
  orderCount: number;
  itemsSold: number;

  // Себестойност на продадени стоки
  costOfGoodsSold: number;

  // Брутна печалба (accrual)
  grossProfit: number;
  grossMargin: number;

  // Оперативни разходи
  expenses: ExpensesSummary;
  payroll: PayrollSummary;
  totalOperatingExpenses: number;

  // Нетна печалба (accrual — върху всички booked продажби)
  netProfit: number;
  netMargin: number;

  // Касова нетна печалба (cash-basis — пропорционално на събраното)
  // netProfitCash = cashRevenue − cashCostOfGoods − totalOperatingExpenses
  netProfitCash: number;
  netMarginCash: number;
  /** Събраната част от нетните приходи / себестойността (за касовия P&L) */
  cashRevenue: number;
  cashCostOfGoods: number;

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

  // ---- Общи правила за приходи и себестойност -------------------------------
  // Приход = без ДДС, след отстъпката на реда и на документа (данъчната основа).
  // Себестойност = САМО от доставки: изписаните партиди (FIFO), партида/сериен
  // номер на реда, snapshot при директна доставка, последна доставна стойност на
  // продукта. Без доставка себестойността е 0 — покупната цена от картона не се
  // ползва, тя е само за предпопълване на нова доставка.

  /** Стойност на реда без ДДС след отстъпката на реда */
  private lineNet(item: {
    quantity: any;
    unitPrice: any;
    subtotal?: any;
  }): number {
    return item.subtotal != null
      ? Number(item.subtotal)
      : Number(item.quantity) * Number(item.unitPrice);
  }

  /** Приход на поръчката без ДДС и след отстъпката на документа */
  private orderNet(order: {
    subtotal?: any;
    discount?: any;
    items: any[];
  }): number {
    const subtotal =
      order.subtotal != null
        ? Number(order.subtotal)
        : order.items.reduce((sum, it) => sum + this.lineNet(it), 0);
    return Math.max(0, subtotal - Number(order.discount || 0));
  }

  /** Коефициент, с който отстъпката на документа се разпределя по редовете */
  private lineFactor(order: {
    subtotal?: any;
    discount?: any;
    items: any[];
  }): number {
    const subtotal =
      order.subtotal != null
        ? Number(order.subtotal)
        : order.items.reduce((sum, it) => sum + this.lineNet(it), 0);
    return subtotal > 0 ? this.orderNet(order) / subtotal : 1;
  }

  /** Себестойност на реда — само от доставки (виж коментара горе) */
  private lineCost(item: {
    quantity: any;
    unitCost?: any;
    batchAllocations?:
      | { quantity: any; inventoryBatch?: { unitCost: any } | null }[]
      | null;
    inventoryBatch?: { unitCost: any } | null;
    inventorySerial?: { unitCost: any } | null;
    product?: { lastLandedCost?: any } | null;
  }): number {
    const qty = Number(item.quantity);
    // 0) директна доставка — snapshot на реда
    if (item.unitCost != null) return qty * Number(item.unitCost);
    const landed =
      item.product?.lastLandedCost != null
        ? Number(item.product.lastLandedCost)
        : 0;
    // 1) FIFO изписване по партиди (обикновени и партидни продукти)
    const allocations = item.batchAllocations || [];
    if (allocations.length > 0) {
      let cost = 0;
      let allocated = 0;
      for (const a of allocations) {
        const aq = Number(a.quantity);
        allocated += aq;
        cost +=
          aq *
          (a.inventoryBatch?.unitCost != null
            ? Number(a.inventoryBatch.unitCost)
            : landed);
      }
      const remaining = qty - allocated;
      if (remaining > 0.0005) cost += remaining * landed;
      return cost;
    }
    // 2) избрана партида / сериен номер на реда
    if (item.inventoryBatch) return qty * Number(item.inventoryBatch.unitCost);
    if (item.inventorySerial)
      return qty * Number(item.inventorySerial.unitCost);
    // 3) последна доставна стойност на продукта (от последната доставка)
    return qty * landed;
  }

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
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        ); // Today end

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
            batchAllocations: {
              include: { inventoryBatch: { select: { unitCost: true } } },
            },
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
    let totalGross = 0;
    let totalPaid = 0;
    let totalCost = 0;
    let totalItemsSold = 0;

    for (const order of orders) {
      // Приходът е данъчната основа на поръчката (без ДДС, след отстъпки), за
      // да е съпоставим със себестойността. Доставката и ДДС не са приход.
      // При филтър по категория поръчка без ред от нея не влиза изобщо.
      const hasMatchingItem =
        !query.categoryId ||
        order.items.some((it) => it.product.categoryId === query.categoryId);
      if (hasMatchingItem) {
        totalRevenue += this.orderNet(order);
        totalGross += Number(order.total);
        // Cash-basis: how much has actually been collected on these orders.
        totalPaid += Number(order.paidAmount ?? 0);
      }
      const factor = this.lineFactor(order);
      for (const item of order.items) {
        // Filter by category if specified
        if (query.categoryId && item.product.categoryId !== query.categoryId) {
          continue;
        }

        const quantity = Number(item.quantity);
        const itemRevenue = this.lineNet(item) * factor;
        const itemCost = this.lineCost(item);

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
      data.profitMargin =
        data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
      data.avgSellingPrice =
        data.unitsSold > 0 ? data.revenue / data.unitsSold : 0;
      data.avgCostPrice = data.unitsSold > 0 ? data.cost / data.unitsSold : 0;
      byProduct.push(data);
    }

    // Sort by profit descending
    byProduct.sort((a, b) => b.profit - a.profit);

    // Aggregate by category
    const categoryMap = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string;
        revenue: number;
        cost: number;
      }
    >();

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

    const byCategory = Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        profit: cat.revenue - cat.cost,
        profitMargin:
          cat.revenue > 0 ? ((cat.revenue - cat.cost) / cat.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);

    // Calculate gross profit
    const grossProfit = totalRevenue - totalCost;
    const profitMargin =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

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
            batchAllocations: {
              include: { inventoryBatch: { select: { unitCost: true } } },
            },
          },
        },
      },
    });

    let previousRevenue = 0;
    let previousCost = 0;

    for (const order of previousOrders) {
      previousRevenue += this.orderNet(order);
      for (const item of order.items) {
        previousCost += this.lineCost(item);
      }
    }

    const previousProfit = previousRevenue - previousCost;
    const revenueGrowth =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0
          ? 100
          : 0;
    const profitGrowth =
      previousProfit > 0
        ? ((grossProfit - previousProfit) / previousProfit) * 100
        : grossProfit > 0
          ? 100
          : 0;

    return {
      summary: {
        totalRevenue,
        totalGross,
        totalPaid,
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
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

    const receiptWhere: any = {
      companyId,
      receiptDate: {
        gte: dateFrom,
        lte: dateTo,
      },
      status: 'DELIVERED',
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
    const productPurchases = new Map<
      string,
      {
        productId: string;
        productName: string;
        productSku: string;
        categoryName: string | null;
        unitsPurchased: number;
        totalCost: number;
        avgCostPrice: number;
      }
    >();

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
    const byProduct = Array.from(productPurchases.values())
      .map((p) => ({
        ...p,
        avgCostPrice: p.unitsPurchased > 0 ? p.totalCost / p.unitsPurchased : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // By supplier
    const supplierMap = new Map<
      string,
      {
        supplierId: string | null;
        supplierName: string;
        totalCost: number;
        receiptCount: number;
      }
    >();

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

    const bySupplier = Array.from(supplierMap.values()).sort(
      (a, b) => b.totalCost - a.totalCost,
    );

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
            month: {
              gte: startMonth,
              lte: startYear === endYear ? endMonth : 12,
            },
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
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

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

    // Изчисляване на нетна печалба (accrual — върху booked-нати продажби)
    const netProfit = profitData.summary.grossProfit - totalOperatingExpenses;
    const netMargin =
      profitData.summary.totalRevenue > 0
        ? (netProfit / profitData.summary.totalRevenue) * 100
        : 0;

    // Касова нетна печалба: какво реално е останало в банката.
    // Cost-ът се прилага пропорционално на колекшън ratio-то — ако сме
    // събрали 60% от продажбите, отчитаме 60% от cost-а. Opex-ът е изцяло
    // изваден (реално платени разходи).
    // Събираемостта се мери спрямо дължимото С ДДС (платеното е с ДДС), а
    // после се прилага върху нетните приходи и себестойността.
    const collectionRatio =
      profitData.summary.totalGross > 0
        ? Math.min(
            1,
            profitData.summary.totalPaid / profitData.summary.totalGross,
          )
        : 0;
    const cashRevenue = profitData.summary.totalRevenue * collectionRatio;
    const cashCostOfGoods = profitData.summary.totalCost * collectionRatio;
    const netProfitCash =
      cashRevenue - cashCostOfGoods - totalOperatingExpenses;
    const netMarginCash =
      cashRevenue > 0 ? (netProfitCash / cashRevenue) * 100 : 0;

    return {
      // Приходи
      revenue: profitData.summary.totalRevenue,
      paid: profitData.summary.totalPaid,
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

      // Нетна печалба (accrual)
      netProfit,
      netMargin,

      // Касова нетна печалба (cash basis)
      netProfitCash,
      netMarginCash,
      cashRevenue,
      cashCostOfGoods,

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
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

    const periodLength = dateTo.getTime() - dateFrom.getTime();
    const previousFrom = new Date(dateFrom.getTime() - periodLength);
    const previousTo = new Date(dateFrom.getTime() - 1);

    const orderWhere: any = {
      companyId,
      orderDate: { gte: dateFrom, lte: dateTo },
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      ...(query.customerId && { customerId: query.customerId }),
      ...(query.siteId && { siteId: query.siteId }),
    };
    const itemInclude = {
      product: { include: { category: true } },
      inventoryBatch: true,
      inventorySerial: true,
      batchAllocations: {
        include: { inventoryBatch: { select: { unitCost: true } } },
      },
    };
    const loadOrders = (from: Date, to: Date) =>
      this.prisma.order.findMany({
        where: { ...orderWhere, orderDate: { gte: from, lte: to } },
        include: {
          items: { include: itemInclude },
          site: { select: { id: true, name: true } },
        },
      });

    const [orders, previousOrders] = await Promise.all([
      loadOrders(dateFrom, dateTo),
      loadOrders(previousFrom, previousTo),
    ]);

    // Филтър по продукт/категория е на ниво ред; поръчка без такъв ред не влиза
    const itemMatches = (item: any) =>
      (!query.productId || item.productId === query.productId) &&
      (!query.categoryId || item.product?.categoryId === query.categoryId);
    const lineFilterActive = !!(query.productId || query.categoryId);

    type Acc = { qty: number; revenue: number; cost: number; orders: Set<string> };
    const makeGroup = () => new Map<string, Acc & { name: string; sub?: string }>();
    const groups = {
      product: makeGroup(),
      customer: makeGroup(),
      month: makeGroup(),
      site: makeGroup(),
    };
    const add = (
      map: ReturnType<typeof makeGroup>,
      key: string,
      name: string,
      sub: string | undefined,
      orderId: string,
      qty: number,
      rev: number,
      cost: number,
    ) => {
      const row = map.get(key) || { name, sub, qty: 0, revenue: 0, cost: 0, orders: new Set<string>() };
      row.qty += qty;
      row.revenue += rev;
      row.cost += cost;
      row.orders.add(orderId);
      map.set(key, row);
    };

    // Сумиране на период: приход, себестойност, платено, брой поръчки, бройки
    const summarize = (list: typeof orders, fill: boolean) => {
      let revenue = 0;
      let paid = 0;
      let cost = 0;
      let itemsSold = 0;
      let orderCount = 0;
      for (const order of list) {
        const items = order.items.filter(itemMatches);
        if (lineFilterActive && items.length === 0) continue;
        orderCount += 1;
        const factor = this.lineFactor(order);
        // При филтър по ред приходът е само на тези редове; иначе цялата основа
        let orderRevenue = 0;
        let orderCost = 0;
        for (const item of items) {
          const qty = Number(item.quantity);
          const rev = this.lineNet(item) * factor;
          const c = this.lineCost(item);
          orderRevenue += rev;
          orderCost += c;
          itemsSold += qty;
          if (fill) {
            add(groups.product, item.productId, item.product.name, item.product.sku || undefined, order.id, qty, rev, c);
          }
        }
        if (!lineFilterActive) orderRevenue = this.orderNet(order);
        revenue += orderRevenue;
        cost += orderCost;
        // Платеното се разпределя пропорционално, ако гледаме част от поръчката
        const total = Number(order.total) || 0;
        const share = lineFilterActive && total > 0 ? Math.min(1, orderRevenue / Math.max(this.orderNet(order), 0.0001)) : 1;
        paid += Number(order.paidAmount ?? 0) * share;
        if (fill) {
          const custKey = order.customerId || `name:${order.customerName}`;
          add(groups.customer, custKey, order.customerName, undefined, order.id, 0, orderRevenue, orderCost);
          const monthKey = order.orderDate.toISOString().slice(0, 7);
          add(groups.month, monthKey, monthKey, undefined, order.id, 0, orderRevenue, orderCost);
          const siteKey = order.siteId || '';
          add(groups.site, siteKey, order.site?.name || '', undefined, order.id, 0, orderRevenue, orderCost);
        }
      }
      return { revenue, paid, cost, itemsSold, orderCount };
    };

    const cur = summarize(orders, true);
    const prev = summarize(previousOrders, false);

    const toRows = (map: ReturnType<typeof makeGroup>): SalesGroupRow[] =>
      Array.from(map.entries())
        .map(([key, r]) => ({
          key,
          name: r.name,
          sub: r.sub,
          quantity: round2(r.qty),
          orderCount: r.orders.size,
          revenue: round2(r.revenue),
          cost: round2(r.cost),
          profit: round2(r.revenue - r.cost),
          margin: r.revenue > 0 ? round2(((r.revenue - r.cost) / r.revenue) * 100) : 0,
        }));
    const byRevenue = (rows: SalesGroupRow[]) => rows.sort((a, b) => b.revenue - a.revenue);
    const byProduct = byRevenue(toRows(groups.product));
    const byCustomer = byRevenue(toRows(groups.customer));
    const bySite = byRevenue(toRows(groups.site));
    const byMonth = toRows(groups.month).sort((a, b) => a.key.localeCompare(b.key));

    const avgOrderValue = cur.orderCount > 0 ? cur.revenue / cur.orderCount : 0;
    const previousAvgOrderValue = prev.orderCount > 0 ? prev.revenue / prev.orderCount : 0;
    const grossProfit = cur.revenue - cur.cost;
    const previousProfit = prev.revenue - prev.cost;
    const calcGrowth = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    return {
      revenue: round2(cur.revenue),
      paid: round2(cur.paid),
      cost: round2(cur.cost),
      grossProfit: round2(grossProfit),
      grossMargin: cur.revenue > 0 ? round2((grossProfit / cur.revenue) * 100) : 0,
      orderCount: cur.orderCount,
      itemsSold: round2(cur.itemsSold),
      avgOrderValue: round2(avgOrderValue),
      periodComparison: {
        previousRevenue: round2(prev.revenue),
        previousPaid: round2(prev.paid),
        previousCost: round2(prev.cost),
        previousProfit: round2(previousProfit),
        previousOrderCount: prev.orderCount,
        previousAvgOrderValue: round2(previousAvgOrderValue),
        revenueGrowth: calcGrowth(cur.revenue, prev.revenue),
        paidGrowth: calcGrowth(cur.paid, prev.paid),
        profitGrowth: calcGrowth(grossProfit, previousProfit),
        orderGrowth: calcGrowth(cur.orderCount, prev.orderCount),
        avgOrderValueGrowth: calcGrowth(avgOrderValue, previousAvgOrderValue),
      },
      byProduct,
      byCustomer,
      byMonth,
      bySite,
      topProducts: byProduct.slice(0, 10).map((r) => ({
        productId: r.key,
        productName: r.name,
        productSku: r.sub || '',
        quantitySold: r.quantity,
        revenue: r.revenue,
      })),
      topCustomers: byCustomer.slice(0, 10).map((r) => ({
        customerId: r.key,
        customerName: r.name,
        orderCount: r.orderCount,
        totalSpent: r.revenue,
      })),
      trend: byMonth.map((r) => ({
        date: r.key,
        revenue: r.revenue,
        cost: r.cost,
        profit: r.profit,
        orderCount: r.orderCount,
      })),
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
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

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
    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        orderCount: number;
        totalSpent: number;
        firstOrderDate: Date;
      }
    >();

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
    const totalRevenue = Array.from(customerMap.values()).reduce(
      (sum, c) => sum + c.totalSpent,
      0,
    );
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
      if (!order.customerId || !newCustomerIds.includes(order.customerId))
        continue;
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

    const previousCustomerIds = new Set(
      previousOrders.filter((o) => o.customerId).map((o) => o.customerId!),
    );
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
      previous > 0
        ? ((current - previous) / previous) * 100
        : current > 0
          ? 100
          : 0;

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
        .map((c) => ({
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
  // Кой клиент колко дължи — салдо към момента по всички активни продажби
  // (без чернови/чакащи/анулирани и без възстановени). Дълг на поръчка =
  // total − paidAmount, отрязан на 0 (надплащането е позволено и не намалява
  // дълга по другите поръчки). Име: актуалното от картона на клиента, с
  // fallback към снапшота в поръчката.
  async getCustomerReceivables(
    companyId: string,
    query: QueryCustomerReceivablesDto,
  ): Promise<CustomerReceivablesResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    const nameExpr = Prisma.sql`COALESCE(
      NULLIF(TRIM(c."companyName"), ''),
      NULLIF(TRIM(CONCAT_WS(' ', c."firstName", c."lastName")), ''),
      MAX(o."customerName")
    )`;
    const dueExpr = Prisma.sql`SUM(GREATEST(o.total - o."paidAmount", 0))`;
    const baseWhere = Prisma.sql`
      o."companyId" = ${companyId}
      AND o."customerId" IS NOT NULL
      AND o.status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
      AND o."paymentStatus" <> 'REFUNDED'`;
    const searchHaving = search
      ? Prisma.sql`AND ${nameExpr} ILIKE ${'%' + search + '%'}`
      : Prisma.empty;

    // Групираме веднъж; филтърът по име и броенето са върху същия израз, за да
    // не се разминават резултатът и totalPages.
    const grouped = Prisma.sql`
      SELECT
        o."customerId" AS "customerId",
        ${nameExpr} AS "customerName",
        COUNT(*) FILTER (WHERE o.total - o."paidAmount" > 0)::int AS "unpaidOrders",
        MIN(o."orderDate") FILTER (WHERE o.total - o."paidAmount" > 0) AS "oldestUnpaidDate",
        SUM(o.total)::float8 AS "ordersTotal",
        SUM(o."paidAmount")::float8 AS "paidTotal",
        ${dueExpr}::float8 AS due
      FROM orders o
      LEFT JOIN customers c ON c.id = o."customerId"
      WHERE ${baseWhere}
      GROUP BY o."customerId", c."companyName", c."firstName", c."lastName"
      HAVING ${dueExpr} > 0 ${searchHaving}`;

    const [rows, countRows, totals] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          customerId: string;
          customerName: string;
          unpaidOrders: number;
          oldestUnpaidDate: Date | null;
          ordersTotal: number;
          paidTotal: number;
          due: number;
        }>
      >(
        Prisma.sql`${grouped} ORDER BY due DESC, "customerName" ASC LIMIT ${limit} OFFSET ${offset}`,
      ),
      this.prisma.$queryRaw<Array<{ count: number }>>(
        Prisma.sql`SELECT COUNT(*)::int AS count FROM (${grouped}) g`,
      ),
      this.prisma.$queryRaw<Array<{ totalDue: number; customers: number }>>(
        Prisma.sql`
          SELECT COALESCE(SUM(due), 0)::float8 AS "totalDue", COUNT(*)::int AS customers
          FROM (
            SELECT ${dueExpr} AS due
            FROM orders o
            WHERE ${baseWhere}
            GROUP BY o."customerId"
            HAVING ${dueExpr} > 0
          ) g`,
      ),
    ]);

    const total = countRows[0]?.count ?? 0;
    return {
      data: rows.map((r) => ({
        ...r,
        oldestUnpaidDate: r.oldestUnpaidDate
          ? r.oldestUnpaidDate.toISOString()
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      totalDue: totals[0]?.totalDue ?? 0,
      customersWithDue: totals[0]?.customers ?? 0,
    };
  }

  // Поръчките, които формират дълга на един клиент — същите критерии като
  // getCustomerReceivables, най-старите първи (тях трябва да се гонят).
  async getCustomerReceivableOrders(
    companyId: string,
    customerId: string,
  ): Promise<CustomerReceivableOrder[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        orderNumber: string;
        orderDate: Date;
        status: string;
        paymentStatus: string;
        total: number;
        paidAmount: number;
      }>
    >`
      SELECT o.id, o."orderNumber", o."orderDate", o.status::text AS status,
             o."paymentStatus"::text AS "paymentStatus",
             o.total::float8 AS total, o."paidAmount"::float8 AS "paidAmount"
      FROM orders o
      WHERE o."companyId" = ${companyId}
        AND o."customerId" = ${customerId}
        AND o.status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
        AND o."paymentStatus" <> 'REFUNDED'
        AND o.total > o."paidAmount"
      ORDER BY o."orderDate" ASC, o."orderNumber" ASC`;
    return rows.map((r) => ({
      ...r,
      orderDate: r.orderDate.toISOString(),
      due: Math.round((r.total - r.paidAmount) * 100) / 100,
    }));
  }

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
      : new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        );

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
    const productStockMap = new Map<
      string,
      { currentStock: number; inventoryValue: number; minStock: number }
    >();
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
      productStockMap.set(product.id, {
        currentStock,
        inventoryValue,
        minStock,
      });

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
    const salesMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        productSku: string;
        quantitySold: number;
        revenue: number;
      }
    >();
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
      if (!recentSoldProductIds.has(product.id)) {
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
      .map((p) => ({
        ...p,
        currentStock: productStockMap.get(p.productId)?.currentStock || 0,
      }));

    // Low stock products list
    const lowStockProducts = products
      .filter((p) => {
        const minStock = Number(p.minStock) || 0;
        if (minStock <= 0) return false;
        const stock = productStockMap.get(p.id);
        return stock && stock.currentStock < minStock;
      })
      .map((p) => {
        const stock = productStockMap.get(p.id)!;
        return {
          productId: p.id,
          productName: p.name,
          productSku: p.sku || '',
          currentStock: stock.currentStock,
          minStockLevel: stock.minStock,
        };
      })
      .sort(
        (a, b) =>
          a.currentStock / a.minStockLevel - b.currentStock / b.minStockLevel,
      );

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
