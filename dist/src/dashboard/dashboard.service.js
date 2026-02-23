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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats(companyId, userId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const [activeTickets, pendingTickets, completedTickets, overdueTickets, activeTicketsLastMonth, completedTicketsLastMonth,] = await Promise.all([
            this.prisma.ticket.count({
                where: { companyId, status: 'IN_PROGRESS' },
            }),
            this.prisma.ticket.count({
                where: { companyId, status: 'TODO' },
            }),
            this.prisma.ticket.count({
                where: {
                    companyId,
                    status: 'DONE',
                    updatedAt: { gte: startOfMonth },
                },
            }),
            this.prisma.ticket.count({
                where: {
                    companyId,
                    status: { in: ['TODO', 'IN_PROGRESS'] },
                    dueDate: { lt: now },
                },
            }),
            this.prisma.ticket.count({
                where: {
                    companyId,
                    status: 'IN_PROGRESS',
                    createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
                },
            }),
            this.prisma.ticket.count({
                where: {
                    companyId,
                    status: 'DONE',
                    updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
                },
            }),
        ]);
        const [totalContacts, totalDeals, newContactsThisMonth] = await Promise.all([
            this.prisma.contact.count({ where: { companyId } }),
            this.prisma.deal.count({ where: { companyId } }),
            this.prisma.contact.count({
                where: { companyId, createdAt: { gte: startOfMonth } },
            }),
        ]);
        const [totalProducts, totalOrders, ordersThisMonth] = await Promise.all([
            this.prisma.product.count({ where: { companyId } }),
            this.prisma.order.count({ where: { companyId } }),
            this.prisma.order.count({
                where: { companyId, createdAt: { gte: startOfMonth } },
            }),
        ]);
        const [totalEmployees, totalDepartments] = await Promise.all([
            this.prisma.userCompany.count({ where: { companyId } }),
            this.prisma.department.count({ where: { companyId } }),
        ]);
        const calculateChange = (current, previous) => {
            if (previous === 0)
                return current > 0 ? '+100%' : '0%';
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
                    change: '0%',
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
    async getRecentActivity(companyId, limit = 10) {
        const [recentContacts, recentOrders, recentTickets] = await Promise.all([
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
        const activities = [
            ...recentContacts.map((c) => ({
                type: 'contact_created',
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
        return activities
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map