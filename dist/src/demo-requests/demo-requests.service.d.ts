import { PrismaService } from '../prisma/prisma.service';
import { CreateDemoRequestDto, UpdateDemoRequestDto, QueryDemoRequestsDto } from './dto';
export declare class DemoRequestsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateDemoRequestDto): Promise<{
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
    }>;
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
    }>;
    findOne(id: string): Promise<{
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
    }>;
    update(id: string, dto: UpdateDemoRequestDto): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
    getStats(): Promise<{
        total: number;
        byStatus: Record<string, number>;
    }>;
    getStatuses(): ("CANCELLED" | "COMPLETED" | "NEW" | "CONTACTED" | "SCHEDULED")[];
}
