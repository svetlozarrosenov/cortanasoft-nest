import { DemoRequestsService } from './demo-requests.service';
import { UpdateDemoRequestDto, QueryDemoRequestsDto } from './dto';
export declare class AdminDemoRequestsController {
    private demoRequestsService;
    constructor(demoRequestsService: DemoRequestsService);
    findAll(query: QueryDemoRequestsDto): Promise<{
        items: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            email: string;
            message: string | null;
            status: import(".prisma/client").$Enums.DemoRequestStatus;
            notes: string | null;
            companyName: string | null;
            employeeCount: string | null;
            scheduledAt: Date | null;
            completedAt: Date | null;
            contactedAt: Date | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        success: boolean;
    }>;
    getStats(): Promise<{
        success: boolean;
        stats: {
            total: number;
            byStatus: Record<string, number>;
        };
    }>;
    getStatuses(): {
        success: boolean;
        statuses: ("CANCELLED" | "COMPLETED" | "NEW" | "CONTACTED" | "SCHEDULED")[];
    };
    findOne(id: string): Promise<{
        success: boolean;
        demoRequest: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            email: string;
            message: string | null;
            status: import(".prisma/client").$Enums.DemoRequestStatus;
            notes: string | null;
            companyName: string | null;
            employeeCount: string | null;
            scheduledAt: Date | null;
            completedAt: Date | null;
            contactedAt: Date | null;
        };
    }>;
    update(id: string, dto: UpdateDemoRequestDto): Promise<{
        success: boolean;
        demoRequest: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            email: string;
            message: string | null;
            status: import(".prisma/client").$Enums.DemoRequestStatus;
            notes: string | null;
            companyName: string | null;
            employeeCount: string | null;
            scheduledAt: Date | null;
            completedAt: Date | null;
            contactedAt: Date | null;
        };
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
