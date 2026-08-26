import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  customer: { count: jest.fn(), findMany: jest.fn() },
  deal: { count: jest.fn() },
  product: { count: jest.fn() },
  order: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
  invoice: { count: jest.fn(), aggregate: jest.fn() },
  userCompany: { count: jest.fn() },
  department: { count: jest.fn() },
  ticket: { count: jest.fn(), findMany: jest.fn() },
  $queryRaw: jest.fn(),
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DashboardService>(DashboardService);
  });

  describe('getDashboardStats', () => {
    beforeEach(() => {
      // Defaults: everything empty/zero
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.customer.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: null, paidAmount: null } });
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { total: null } });
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);
      mockPrisma.$queryRaw.mockResolvedValue([{ count: 0n }]);
    });

    it('should return all stats sections', async () => {
      const result = await service.getDashboardStats('c1', 'u1');

      expect(result).toHaveProperty('quickStats');
      expect(result).toHaveProperty('modules');
      expect(result).toHaveProperty('recentOrders');
      expect(result.modules).toHaveProperty('crm');
      expect(result.modules).toHaveProperty('erp');
      expect(result.modules).toHaveProperty('hr');
      expect(result.modules).toHaveProperty('tickets');
    });

    it('should compute revenue and paid quick stats from order aggregates', async () => {
      // order.aggregate call order: revenueThisMonth, revenueLastMonth, paidThisMonth, paidLastMonth
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 1000 } })
        .mockResolvedValueOnce({ _sum: { total: 500 } })
        .mockResolvedValueOnce({ _sum: { paidAmount: 800 } })
        .mockResolvedValueOnce({ _sum: { paidAmount: 400 } });

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.quickStats.revenue.value).toBe(1000);
      expect(result.quickStats.revenue.change).toBe('+100%'); // 500 → 1000
      expect(result.quickStats.paid.value).toBe(800);
      expect(result.quickStats.paid.change).toBe('+100%'); // 400 → 800
    });

    it('should handle zero previous revenue (0→N = +100%)', async () => {
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 700 } })
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _sum: { paidAmount: null } })
        .mockResolvedValueOnce({ _sum: { paidAmount: null } });

      const result = await service.getDashboardStats('c1', 'u1');
      expect(result.quickStats.revenue.change).toBe('+100%');
    });

    it('should handle zero both (0→0 = 0%)', async () => {
      const result = await service.getDashboardStats('c1', 'u1');
      expect(result.quickStats.revenue.change).toBe('0%');
      expect(result.quickStats.paid.change).toBe('0%');
    });

    it('should handle negative change (decrease)', async () => {
      // revenue: 300 now, 1000 last month → -70%
      mockPrisma.order.aggregate
        .mockResolvedValueOnce({ _sum: { total: 300 } })
        .mockResolvedValueOnce({ _sum: { total: 1000 } })
        .mockResolvedValueOnce({ _sum: { paidAmount: null } })
        .mockResolvedValueOnce({ _sum: { paidAmount: null } });

      const result = await service.getDashboardStats('c1', 'u1');
      expect(result.quickStats.revenue.change).toBe('-70%');
    });

    it('should compute ordersThisMonth change from counts', async () => {
      // order.count call order: totalOrders, ordersThisMonth, ordersLastMonth
      mockPrisma.order.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(10);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.quickStats.ordersThisMonth.value).toBe(15);
      expect(result.quickStats.ordersThisMonth.change).toBe('+50%'); // 10 → 15
      expect(result.modules.erp.orders).toBe(100);
      expect(result.modules.erp.ordersThisMonth).toBe(15);
    });

    it('should report unpaid invoices count and amount', async () => {
      mockPrisma.invoice.count.mockResolvedValue(4);
      mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { total: 2500 } });

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.quickStats.unpaidInvoices.value).toBe(4);
      expect(result.quickStats.unpaidInvoices.amount).toBe(2500);
    });

    it('should report low stock count from the raw query', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ count: 3n }]);

      const result = await service.getDashboardStats('c1', 'u1');
      expect(result.quickStats.lowStock.value).toBe(3);
    });

    it('should map recent orders with numeric totals', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: 'o1',
          orderNumber: 'ORD-2026-0001',
          customerName: 'Иван Иванов',
          total: '123.45',
          status: 'CONFIRMED',
          createdAt: new Date('2026-02-01T10:00:00Z'),
        },
      ]);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.recentOrders).toHaveLength(1);
      expect(result.recentOrders[0].orderNumber).toBe('ORD-2026-0001');
      expect(result.recentOrders[0].total).toBe(123.45);
    });

    it('should return correct CRM stats', async () => {
      mockPrisma.customer.count
        .mockResolvedValueOnce(50) // totalLeads
        .mockResolvedValueOnce(5); // newLeadsThisMonth
      mockPrisma.deal.count.mockResolvedValue(20);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.modules.crm.leads).toBe(50);
      expect(result.modules.crm.deals).toBe(20);
      expect(result.modules.crm.newLeadsThisMonth).toBe(5);
    });

    it('should return correct HR stats', async () => {
      mockPrisma.userCompany.count.mockResolvedValue(10);
      mockPrisma.department.count.mockResolvedValue(3);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.modules.hr.employees).toBe(10);
      expect(result.modules.hr.departments).toBe(3);
    });

    it('should combine active + pending as tickets.active in modules', async () => {
      // ticket.count call order: active, pending, completed, overdue,
      // activeLastMonth, completedLastMonth
      mockPrisma.ticket.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.modules.tickets.active).toBe(8); // 5 + 3
      expect(result.modules.tickets.completed).toBe(7);
    });
  });

  describe('getRecentActivity', () => {
    it('should combine contacts, orders, and tickets sorted by date', async () => {
      const date1 = new Date('2026-02-20T10:00:00Z');
      const date2 = new Date('2026-02-21T10:00:00Z');
      const date3 = new Date('2026-02-19T10:00:00Z');

      mockPrisma.customer.findMany.mockResolvedValue([
        { id: 'c1', firstName: 'John', lastName: 'Doe', createdAt: date1 },
      ]);
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'o1', orderNumber: 'ORD-001', status: 'PENDING', createdAt: date2 },
      ]);
      mockPrisma.ticket.findMany.mockResolvedValue([
        { id: 't1', ticketNumber: 'T-001', title: 'Bug', status: 'TODO', assignee: null, createdAt: date3 },
      ]);

      const result = await service.getRecentActivity('c1');

      expect(result).toHaveLength(3);
      // Sorted desc: order (21st), contact (20th), ticket (19th)
      expect(result[0].id).toBe('o1');
      expect(result[0].type).toBe('order_created');
      expect(result[1].id).toBe('c1');
      expect(result[1].type).toBe('lead_created');
      expect(result[2].id).toBe('t1');
      expect(result[2].type).toBe('ticket_created');
    });

    it('should mark DELIVERED orders as order_completed', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'o1', orderNumber: 'ORD-001', status: 'DELIVERED', createdAt: new Date() },
      ]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivity('c1');
      expect(result[0].type).toBe('order_completed');
    });

    it('should mark tickets with assignee as ticket_assigned', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.ticket.findMany.mockResolvedValue([
        { id: 't1', ticketNumber: 'T-001', title: 'Task', status: 'IN_PROGRESS', assignee: { firstName: 'A', lastName: 'B' }, createdAt: new Date() },
      ]);

      const result = await service.getRecentActivity('c1');
      expect(result[0].type).toBe('ticket_assigned');
    });

    it('should respect the limit parameter', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        id: `c${i}`, firstName: 'F', lastName: 'L', createdAt: new Date(Date.now() - i * 1000),
      }));
      mockPrisma.customer.findMany.mockResolvedValue(items);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivity('c1');
      const limited = await service.getRecentActivity('c1', 3);
      expect(result).toHaveLength(5);
      expect(limited).toHaveLength(3);
    });

    it('should handle empty results', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivity('c1');
      expect(result).toHaveLength(0);
    });
  });
});
