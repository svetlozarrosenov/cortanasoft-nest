import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(companyId: string, userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get ticket stats
    const [
      activeTickets,
      pendingTickets,
      completedTickets,
      overdueTickets,
      activeTicketsLastMonth,
      completedTicketsLastMonth,
    ] = await Promise.all([
      // Active tickets (IN_PROGRESS)
      this.prisma.ticket.count({
        where: { companyId, status: 'IN_PROGRESS' },
      }),
      // Pending tickets (TODO)
      this.prisma.ticket.count({
        where: { companyId, status: 'TODO' },
      }),
      // Completed tickets this month (DONE)
      this.prisma.ticket.count({
        where: {
          companyId,
          status: 'DONE',
          updatedAt: { gte: startOfMonth },
        },
      }),
      // Overdue tickets
      this.prisma.ticket.count({
        where: {
          companyId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
      }),
      // Active tickets last month (for comparison)
      this.prisma.ticket.count({
        where: {
          companyId,
          status: 'IN_PROGRESS',
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
      // Completed tickets last month (DONE)
      this.prisma.ticket.count({
        where: {
          companyId,
          status: 'DONE',
          updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
    ]);

    // Get CRM stats
    const [totalContacts, totalDeals, newContactsThisMonth] = await Promise.all(
      [
        this.prisma.contact.count({ where: { companyId } }),
        this.prisma.deal.count({ where: { companyId } }),
        this.prisma.contact.count({
          where: { companyId, createdAt: { gte: startOfMonth } },
        }),
      ],
    );

    // Get ERP stats
    const [totalProducts, totalOrders, ordersThisMonth] = await Promise.all([
      this.prisma.product.count({ where: { companyId } }),
      this.prisma.order.count({ where: { companyId } }),
      this.prisma.order.count({
        where: { companyId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    // Get HR stats (employees are users linked to company via userCompany)
    const [totalEmployees, totalDepartments] = await Promise.all([
      this.prisma.userCompany.count({ where: { companyId } }),
      this.prisma.department.count({ where: { companyId } }),
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number): string => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
    };

    return {
      quickStats: {
        activeTasks: {
          value: activeTickets,
          change: calculateChange(activeTickets, activeTicketsLastMonth),
        },
        pending: {
          value: pendingTickets,
          change: '0%', // No comparison for pending
        },
        completed: {
          value: completedTickets,
          change: calculateChange(completedTickets, completedTicketsLastMonth),
        },
        overdue: {
          value: overdueTickets,
          change: '0%',
        },
      },
      modules: {
        crm: {
          contacts: totalContacts,
          deals: totalDeals,
          newContactsThisMonth,
        },
        erp: {
          products: totalProducts,
          orders: totalOrders,
          ordersThisMonth,
        },
        hr: {
          employees: totalEmployees,
          departments: totalDepartments,
        },
        tickets: {
          active: activeTickets + pendingTickets,
          completed: completedTickets,
        },
      },
    };
  }

  async getRecentActivity(companyId: string, limit = 10) {
    // Get recent activities from various sources
    const [recentContacts, recentOrders, recentTickets] = await Promise.all([
      // Recent contacts
      this.prisma.contact.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      }),
      // Recent orders
      this.prisma.order.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
        },
      }),
      // Recent tickets
      this.prisma.ticket.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          createdAt: true,
          assignee: {
            select: { firstName: true, lastName: true },
          },
        },
      }),
    ]);

    // Combine and sort by date
    const activities: Array<{
      type: string;
      id: string;
      data: Record<string, any>;
      createdAt: Date;
    }> = [
      ...recentContacts.map((c) => ({
        type: 'contact_created' as const,
        id: c.id,
        data: { name: `${c.firstName} ${c.lastName}` },
        createdAt: c.createdAt,
      })),
      ...recentOrders.map((o) => ({
        type: o.status === 'DELIVERED' ? 'order_completed' : 'order_created',
        id: o.id,
        data: { orderNumber: o.orderNumber },
        createdAt: o.createdAt,
      })),
      ...recentTickets.map((t) => ({
        type: t.assignee ? 'ticket_assigned' : 'ticket_created',
        id: t.id,
        data: { ticketNumber: t.ticketNumber, title: t.title },
        createdAt: t.createdAt,
      })),
    ];

    // Sort by date and take limit
    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
