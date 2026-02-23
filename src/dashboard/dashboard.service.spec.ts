import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  ticket: { count: jest.fn() },
  contact: { count: jest.fn(), findMany: jest.fn() },
  deal: { count: jest.fn() },
  product: { count: jest.fn() },
  order: { count: jest.fn(), findMany: jest.fn() },
  userCompany: { count: jest.fn() },
  department: { count: jest.fn() },
  ticket: { count: jest.fn(), findMany: jest.fn() },
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
      // Default: all counts return 0
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);
    });

    it('should return all stats sections', async () => {
      const result = await service.getDashboardStats('c1', 'u1');

      expect(result).toHaveProperty('quickStats');
      expect(result).toHaveProperty('modules');
      expect(result.modules).toHaveProperty('crm');
      expect(result.modules).toHaveProperty('erp');
      expect(result.modules).toHaveProperty('hr');
      expect(result.modules).toHaveProperty('tickets');
    });

    it('should return correct ticket stats', async () => {
      // 6 calls: active, pending, completed, overdue, activeLastMonth, completedLastMonth
      mockPrisma.ticket.count
        .mockResolvedValueOnce(5)   // activeTickets
        .mockResolvedValueOnce(3)   // pendingTickets
        .mockResolvedValueOnce(10)  // completedTickets
        .mockResolvedValueOnce(2)   // overdueTickets
        .mockResolvedValueOnce(4)   // activeTicketsLastMonth
        .mockResolvedValueOnce(8);  // completedTicketsLastMonth

      // CRM
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);

      // ERP
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);

      // HR
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.quickStats.activeTasks.value).toBe(5);
      expect(result.quickStats.pending.value).toBe(3);
      expect(result.quickStats.completed.value).toBe(10);
      expect(result.quickStats.overdue.value).toBe(2);
    });

    it('should calculate percentage change correctly (positive growth)', async () => {
      // active: 10 now, 5 last month → +100%
      mockPrisma.ticket.count
        .mockResolvedValueOnce(10)  // activeTickets
        .mockResolvedValueOnce(0)   // pending
        .mockResolvedValueOnce(0)   // completed
        .mockResolvedValueOnce(0)   // overdue
        .mockResolvedValueOnce(5)   // activeTicketsLastMonth
        .mockResolvedValueOnce(0);  // completedTicketsLastMonth

      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('c1', 'u1');
      expect(result.quickStats.activeTasks.change).toBe('+100%');
    });

    it('should handle zero previous (0→N = +100%)', async () => {
      mockPrisma.ticket.count
        .mockResolvedValueOnce(7)   // activeTickets
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)   // activeTicketsLastMonth = 0
        .mockResolvedValueOnce(0);

      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('c1', 'u1');
      expect(result.quickStats.activeTasks.change).toBe('+100%');
    });

    it('should handle zero both (0→0 = 0%)', async () => {
      mockPrisma.ticket.count
        .mockResolvedValueOnce(0)   // activeTickets = 0
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)   // activeTicketsLastMonth = 0
        .mockResolvedValueOnce(0);

      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('c1', 'u1');
      expect(result.quickStats.activeTasks.change).toBe('0%');
    });

    it('should return correct ERP stats (products and orders)', async () => {
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(25);
      mockPrisma.order.count
        .mockResolvedValueOnce(100)  // totalOrders
        .mockResolvedValueOnce(15);  // ordersThisMonth
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.modules.erp.products).toBe(25);
      expect(result.modules.erp.orders).toBe(100);
      expect(result.modules.erp.ordersThisMonth).toBe(15);
    });

    it('should return correct CRM stats', async () => {
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.contact.count
        .mockResolvedValueOnce(50)   // totalContacts
        .mockResolvedValueOnce(5);   // newContactsThisMonth
      mockPrisma.deal.count.mockResolvedValue(20);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.modules.crm.contacts).toBe(50);
      expect(result.modules.crm.deals).toBe(20);
      expect(result.modules.crm.newContactsThisMonth).toBe(5);
    });

    it('should return correct HR stats', async () => {
      mockPrisma.ticket.count.mockResolvedValue(0);
      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userCompany.count.mockResolvedValue(10);
      mockPrisma.department.count.mockResolvedValue(3);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.modules.hr.employees).toBe(10);
      expect(result.modules.hr.departments).toBe(3);
    });

    it('should combine active + pending as tickets.active in modules', async () => {
      mockPrisma.ticket.count
        .mockResolvedValueOnce(5)   // activeTickets
        .mockResolvedValueOnce(3)   // pendingTickets
        .mockResolvedValueOnce(7)   // completedTickets
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('c1', 'u1');

      expect(result.modules.tickets.active).toBe(8); // 5 + 3
      expect(result.modules.tickets.completed).toBe(7);
    });

    it('should handle negative change (decrease)', async () => {
      // completed: 3 now, 10 last month → -70%
      mockPrisma.ticket.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3)   // completedTickets = 3
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(10); // completedTicketsLastMonth = 10

      mockPrisma.contact.count.mockResolvedValue(0);
      mockPrisma.deal.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.userCompany.count.mockResolvedValue(0);
      mockPrisma.department.count.mockResolvedValue(0);

      const result = await service.getDashboardStats('c1', 'u1');
      expect(result.quickStats.completed.change).toBe('-70%');
    });
  });

  describe('getRecentActivity', () => {
    it('should combine contacts, orders, and tickets sorted by date', async () => {
      const date1 = new Date('2026-02-20T10:00:00Z');
      const date2 = new Date('2026-02-21T10:00:00Z');
      const date3 = new Date('2026-02-19T10:00:00Z');

      mockPrisma.contact.findMany.mockResolvedValue([
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
      expect(result[1].type).toBe('contact_created');
      expect(result[2].id).toBe('t1');
      expect(result[2].type).toBe('ticket_created');
    });

    it('should mark DELIVERED orders as order_completed', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([
        { id: 'o1', orderNumber: 'ORD-001', status: 'DELIVERED', createdAt: new Date() },
      ]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivity('c1');
      expect(result[0].type).toBe('order_completed');
    });

    it('should mark tickets with assignee as ticket_assigned', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
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
      mockPrisma.contact.findMany.mockResolvedValue(items);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivity('c1', 3);
      expect(result).toHaveLength(3);
    });

    it('should handle empty results', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.ticket.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivity('c1');
      expect(result).toHaveLength(0);
    });
  });
});
