import { PrismaService } from '../prisma/prisma.service';
export declare class CurrenciesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(isActive?: boolean): Promise<{
        symbol: string;
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        symbol: string;
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findByCode(code: string): Promise<{
        symbol: string;
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
}
