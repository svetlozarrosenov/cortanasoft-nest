import { PrismaService } from '../prisma/prisma.service';
export declare class EmployeesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(companyId: string): Promise<{
        data: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            isActive: boolean;
            role: {
                id: string;
                name: string;
                description: string | null;
            };
            isDefault: boolean;
            createdAt: Date;
            updatedAt: Date;
        }[];
        meta: {
            total: number;
        };
    }>;
    findOne(companyId: string, userId: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        role: {
            id: string;
            name: string;
            description: string | null;
        };
        isDefault: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
