import { PrismaService } from '../prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(companyId: string, userId: string): Promise<{
        quickStats: {
            activeTasks: {
                value: number;
                change: string;
            };
            pending: {
                value: number;
                change: string;
            };
            completed: {
                value: number;
                change: string;
            };
            overdue: {
                value: number;
                change: string;
            };
        };
        modules: {
            crm: {
                contacts: number;
                deals: number;
                newContactsThisMonth: number;
            };
            erp: {
                products: number;
                orders: number;
                ordersThisMonth: number;
            };
            hr: {
                employees: number;
                departments: number;
            };
            tickets: {
                active: number;
                completed: number;
            };
        };
    }>;
    getRecentActivity(companyId: string, limit?: number): Promise<{
        type: string;
        id: string;
        data: Record<string, any>;
        createdAt: Date;
    }[]>;
}
