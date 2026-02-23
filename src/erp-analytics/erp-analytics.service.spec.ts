import { Test, TestingModule } from '@nestjs/testing';
import { ErpAnalyticsService } from './erp-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';

const mockPrisma = {
  order: { findMany: jest.fn() },
  goodsReceipt: { findMany: jest.fn() },
  payroll: { findMany: jest.fn() },
};

const mockExpensesService = {
  getExpensesSummary: jest.fn(),
};

describe('ErpAnalyticsService', () => {
  let service: ErpAnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErpAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ExpensesService, useValue: mockExpensesService },
      ],
    }).compile();
    service = module.get<ErpAnalyticsService>(ErpAnalyticsService);
  });

  const makeOrderItem = (overrides = {}) => ({
    productId: 'p1',
    quantity: 10,
    unitPrice: 100,
    product: {
      name: 'Product A',
      sku: 'SKU-A',
      purchasePrice: 60,
      categoryId: 'cat1',
      category: { name: 'Electronics' },
    },
    inventoryBatch: null,
    ...overrides,
  });

  describe('getProfitAnalytics', () => {
    it('should calculate revenue, cost, and profit correctly', async () => {
      // Current period order
      mockPrisma.order.findMany
        .mockResolvedValueOnce([ // current period
          {
            id: 'o1',
            items: [makeOrderItem({ quantity: 10, unitPrice: 100 })],
          },
        ])
        .mockResolvedValueOnce([]); // previous period

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // revenue = 10 * 100 = 1000
      // cost = 10 * 60 (purchasePrice) = 600
      expect(result.summary.totalRevenue).toBe(1000);
      expect(result.summary.totalCost).toBe(600);
      expect(result.summary.grossProfit).toBe(400);
      expect(result.summary.itemsSold).toBe(10);
      expect(result.summary.orderCount).toBe(1);
    });

    it('should use inventoryBatch.unitCost over product.purchasePrice', async () => {
      const item = makeOrderItem({
        inventoryBatch: { unitCost: 40 },
      });

      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'o1', items: [item] }])
        .mockResolvedValueOnce([]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // cost = 10 * 40 (batch cost) = 400
      expect(result.summary.totalCost).toBe(400);
      expect(result.summary.grossProfit).toBe(600);
    });

    it('should handle zero cost (no purchasePrice, no batch)', async () => {
      const item = makeOrderItem({
        product: { name: 'Service', sku: 'SRV', purchasePrice: null, categoryId: null, category: null },
        inventoryBatch: null,
      });

      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'o1', items: [item] }])
        .mockResolvedValueOnce([]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.summary.totalCost).toBe(0);
      expect(result.summary.grossProfit).toBe(1000);
      expect(result.summary.profitMargin).toBe(100);
    });

    it('should aggregate by product correctly', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([
          {
            id: 'o1',
            items: [
              makeOrderItem({ productId: 'p1', quantity: 5, unitPrice: 100 }),
              makeOrderItem({ productId: 'p2', quantity: 3, unitPrice: 200, product: { name: 'Product B', sku: 'SKU-B', purchasePrice: 120, categoryId: 'cat1', category: { name: 'Electronics' } } }),
            ],
          },
          {
            id: 'o2',
            items: [
              makeOrderItem({ productId: 'p1', quantity: 5, unitPrice: 100 }),
            ],
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.byProduct).toHaveLength(2);
      // p1: 10 units * 100 = 1000 rev, 10 * 60 = 600 cost, 400 profit
      const p1 = result.byProduct.find(p => p.productId === 'p1');
      expect(p1!.unitsSold).toBe(10);
      expect(p1!.revenue).toBe(1000);
      expect(p1!.cost).toBe(600);
      expect(p1!.profit).toBe(400);
      expect(p1!.avgSellingPrice).toBe(100);
      expect(p1!.avgCostPrice).toBe(60);
    });

    it('should aggregate by category', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([
          {
            id: 'o1',
            items: [
              makeOrderItem({ productId: 'p1', quantity: 10, unitPrice: 100 }),
              makeOrderItem({
                productId: 'p2', quantity: 5, unitPrice: 200,
                product: { name: 'Gadget', sku: 'G1', purchasePrice: 100, categoryId: 'cat1', category: { name: 'Electronics' } },
              }),
            ],
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // Both products in 'Electronics' category
      expect(result.byCategory).toHaveLength(1);
      expect(result.byCategory[0].categoryName).toBe('Electronics');
      // p1: rev 1000, cost 600; p2: rev 1000, cost 500
      expect(result.byCategory[0].revenue).toBe(2000);
      expect(result.byCategory[0].cost).toBe(1100);
      expect(result.byCategory[0].profit).toBe(900);
    });

    it('should label uncategorized products', async () => {
      const item = makeOrderItem({
        product: { name: 'Loose', sku: 'L1', purchasePrice: 10, categoryId: null, category: null },
      });

      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'o1', items: [item] }])
        .mockResolvedValueOnce([]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.byCategory[0].categoryName).toBe('Без категория');
    });

    it('should calculate period comparison (revenue growth)', async () => {
      // Current period: revenue 1000
      mockPrisma.order.findMany
        .mockResolvedValueOnce([
          { id: 'o1', items: [makeOrderItem({ quantity: 10, unitPrice: 100 })] },
        ])
        // Previous period: revenue 500
        .mockResolvedValueOnce([
          {
            id: 'o-prev',
            items: [{
              quantity: 5, unitPrice: 100,
              inventoryBatch: null,
              product: { purchasePrice: 60 },
            }],
          },
        ]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // previous revenue = 5*100 = 500, current = 1000
      // growth = (1000-500)/500 * 100 = 100%
      expect(result.periodComparison!.previousRevenue).toBe(500);
      expect(result.periodComparison!.revenueGrowth).toBe(100);
    });

    it('should handle 100% growth when previous is zero', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([
          { id: 'o1', items: [makeOrderItem()] },
        ])
        .mockResolvedValueOnce([]); // no previous orders

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.periodComparison!.revenueGrowth).toBe(100);
      expect(result.periodComparison!.profitGrowth).toBe(100);
    });

    it('should handle empty orders', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.summary.totalRevenue).toBe(0);
      expect(result.summary.totalCost).toBe(0);
      expect(result.summary.grossProfit).toBe(0);
      expect(result.summary.profitMargin).toBe(0);
      expect(result.summary.orderCount).toBe(0);
      expect(result.byProduct).toHaveLength(0);
      expect(result.byCategory).toHaveLength(0);
    });

    it('should filter by categoryId', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([
          {
            id: 'o1',
            items: [
              makeOrderItem({ productId: 'p1', product: { name: 'A', sku: 'A', purchasePrice: 60, categoryId: 'cat1', category: { name: 'Elec' } } }),
              makeOrderItem({ productId: 'p2', product: { name: 'B', sku: 'B', purchasePrice: 30, categoryId: 'cat2', category: { name: 'Food' } } }),
            ],
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
        categoryId: 'cat1',
      } as any);

      // Only cat1 product should be included
      expect(result.byProduct).toHaveLength(1);
      expect(result.byProduct[0].productId).toBe('p1');
      expect(result.summary.totalRevenue).toBe(1000);
    });

    it('should sort products by profit descending', async () => {
      mockPrisma.order.findMany
        .mockResolvedValueOnce([
          {
            id: 'o1',
            items: [
              makeOrderItem({ productId: 'p1', quantity: 1, unitPrice: 100, product: { name: 'Low', sku: 'L', purchasePrice: 90, categoryId: null, category: null } }),
              makeOrderItem({ productId: 'p2', quantity: 1, unitPrice: 100, product: { name: 'High', sku: 'H', purchasePrice: 10, categoryId: null, category: null } }),
            ],
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getProfitAnalytics('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // p2 profit=90 > p1 profit=10
      expect(result.byProduct[0].productId).toBe('p2');
      expect(result.byProduct[1].productId).toBe('p1');
    });
  });

  describe('getPurchaseSummary', () => {
    const makeReceiptItem = (overrides = {}) => ({
      productId: 'p1',
      quantity: 20,
      unitPrice: 50,
      exchangeRate: 1,
      product: { name: 'Widget', sku: 'W1', categoryId: 'cat1', category: { name: 'Parts' } },
      ...overrides,
    });

    it('should calculate purchase totals correctly', async () => {
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([
        {
          id: 'gr1',
          supplierId: 's1',
          supplier: { name: 'Supplier A' },
          items: [makeReceiptItem({ quantity: 20, unitPrice: 50 })],
        },
      ]);

      const result = await service.getPurchaseSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // 20 * 50 * 1 = 1000
      expect(result.summary.totalPurchaseCost).toBe(1000);
      expect(result.summary.totalUnitsPurchased).toBe(20);
      expect(result.summary.receiptCount).toBe(1);
    });

    it('should apply exchangeRate to cost', async () => {
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([
        {
          id: 'gr1',
          supplierId: 's1',
          supplier: { name: 'S' },
          items: [makeReceiptItem({ quantity: 10, unitPrice: 100, exchangeRate: 1.96 })],
        },
      ]);

      const result = await service.getPurchaseSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // 10 * 100 * 1.96 = 1960
      expect(result.summary.totalPurchaseCost).toBe(1960);
    });

    it('should default exchangeRate to 1 when null', async () => {
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([
        {
          id: 'gr1',
          supplierId: 's1',
          supplier: { name: 'S' },
          items: [makeReceiptItem({ quantity: 5, unitPrice: 100, exchangeRate: null })],
        },
      ]);

      const result = await service.getPurchaseSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // 5 * 100 * 1 (fallback) = 500
      expect(result.summary.totalPurchaseCost).toBe(500);
    });

    it('should aggregate by product with avg cost', async () => {
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([
        {
          id: 'gr1', supplierId: 's1', supplier: { name: 'S' },
          items: [makeReceiptItem({ productId: 'p1', quantity: 10, unitPrice: 50 })],
        },
        {
          id: 'gr2', supplierId: 's1', supplier: { name: 'S' },
          items: [makeReceiptItem({ productId: 'p1', quantity: 10, unitPrice: 70 })],
        },
      ]);

      const result = await service.getPurchaseSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.byProduct).toHaveLength(1);
      expect(result.byProduct[0].unitsPurchased).toBe(20);
      expect(result.byProduct[0].totalCost).toBe(1200); // 500 + 700
      expect(result.byProduct[0].avgCostPrice).toBe(60); // 1200/20
    });

    it('should aggregate by supplier', async () => {
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([
        {
          id: 'gr1', supplierId: 's1', supplier: { name: 'Supplier A' },
          items: [makeReceiptItem({ quantity: 10, unitPrice: 100 })],
        },
        {
          id: 'gr2', supplierId: 's2', supplier: { name: 'Supplier B' },
          items: [makeReceiptItem({ quantity: 5, unitPrice: 200 })],
        },
        {
          id: 'gr3', supplierId: 's1', supplier: { name: 'Supplier A' },
          items: [makeReceiptItem({ quantity: 5, unitPrice: 50 })],
        },
      ]);

      const result = await service.getPurchaseSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.bySupplier).toHaveLength(2);
      // Sorted by totalCost desc
      const sA = result.bySupplier.find(s => s.supplierId === 's1');
      const sB = result.bySupplier.find(s => s.supplierId === 's2');
      expect(sA!.receiptCount).toBe(2);
      expect(sA!.totalCost).toBe(1250); // 1000 + 250
      expect(sB!.receiptCount).toBe(1);
      expect(sB!.totalCost).toBe(1000);
    });

    it('should handle empty receipts', async () => {
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([]);

      const result = await service.getPurchaseSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.summary.totalPurchaseCost).toBe(0);
      expect(result.summary.totalUnitsPurchased).toBe(0);
      expect(result.summary.receiptCount).toBe(0);
      expect(result.byProduct).toHaveLength(0);
      expect(result.bySupplier).toHaveLength(0);
    });

    it('should label unknown supplier', async () => {
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([
        {
          id: 'gr1', supplierId: null, supplier: null,
          items: [makeReceiptItem({ quantity: 1, unitPrice: 10 })],
        },
      ]);

      const result = await service.getPurchaseSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.bySupplier[0].supplierName).toBe('Неизвестен доставчик');
    });
  });

  describe('getFinancialSummary', () => {
    it('should calculate P&L correctly', async () => {
      // Profit analytics: revenue 10000, cost 6000 → grossProfit 4000
      mockPrisma.order.findMany
        .mockResolvedValueOnce([ // current orders
          {
            id: 'o1',
            items: [makeOrderItem({ quantity: 100, unitPrice: 100 })], // rev 10000, cost 6000
          },
        ])
        .mockResolvedValueOnce([]); // previous period

      // Purchase summary
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([
        {
          id: 'gr1', supplierId: 's1', supplier: { name: 'S' },
          items: [{
            productId: 'p1', quantity: 50, unitPrice: 60, exchangeRate: 1,
            product: { name: 'P', sku: 'P', categoryId: null, category: null },
          }],
        },
      ]);

      // Expenses
      mockExpensesService.getExpensesSummary.mockResolvedValue({
        totalExpenses: 500,
        expenseCount: 5,
        byCategory: [{ category: 'Office', amount: 500 }],
      });

      // Payroll
      mockPrisma.payroll.findMany.mockResolvedValue([
        { userId: 'u1', grossSalary: 2000, insuranceEmployer: 300 },
        { userId: 'u2', grossSalary: 1500, insuranceEmployer: 200 },
      ]);

      const result = await service.getFinancialSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      // revenue
      expect(result.revenue).toBe(10000);
      expect(result.costOfGoodsSold).toBe(6000);
      expect(result.grossProfit).toBe(4000);

      // operating expenses = expenses(500) + salaries(3500) + insurance(500) = 4500
      expect(result.expenses.totalExpenses).toBe(500);
      expect(result.payroll.totalSalaries).toBe(3500);
      expect(result.payroll.totalInsurance).toBe(500);
      expect(result.totalOperatingExpenses).toBe(4500);

      // net profit = 4000 - 4500 = -500
      expect(result.netProfit).toBe(-500);

      // purchases
      expect(result.totalPurchases).toBe(3000); // 50*60
    });

    it('should return top 10 products and top 5 categories/suppliers', async () => {
      // Create 12 products to test top-10 slicing
      const items = Array.from({ length: 12 }, (_, i) => makeOrderItem({
        productId: `p${i}`,
        quantity: 1,
        unitPrice: (12 - i) * 100,
        product: {
          name: `Product ${i}`,
          sku: `SKU${i}`,
          purchasePrice: 10,
          categoryId: `cat${i % 6}`,
          category: { name: `Cat ${i % 6}` },
        },
      }));

      mockPrisma.order.findMany
        .mockResolvedValueOnce([{ id: 'o1', items }])
        .mockResolvedValueOnce([]);

      mockPrisma.goodsReceipt.findMany.mockResolvedValue([]);
      mockExpensesService.getExpensesSummary.mockResolvedValue({
        totalExpenses: 0, expenseCount: 0, byCategory: [],
      });
      mockPrisma.payroll.findMany.mockResolvedValue([]);

      const result = await service.getFinancialSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.topProducts.length).toBeLessThanOrEqual(10);
      expect(result.topCategories.length).toBeLessThanOrEqual(5);
    });

    it('should handle all zeros', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.goodsReceipt.findMany.mockResolvedValue([]);
      mockExpensesService.getExpensesSummary.mockResolvedValue({
        totalExpenses: 0, expenseCount: 0, byCategory: [],
      });
      mockPrisma.payroll.findMany.mockResolvedValue([]);

      const result = await service.getFinancialSummary('c1', {
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      } as any);

      expect(result.revenue).toBe(0);
      expect(result.grossProfit).toBe(0);
      expect(result.netProfit).toBe(0);
      expect(result.netMargin).toBe(0);
    });
  });
});
