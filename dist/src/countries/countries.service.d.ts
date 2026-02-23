import { PrismaService } from '../prisma/prisma.service';
export declare class CountriesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(isActive?: boolean, isEU?: boolean): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        nativeName: string | null;
        phoneCode: string | null;
        isEU: boolean;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        nativeName: string | null;
        phoneCode: string | null;
        isEU: boolean;
    } | null>;
    findByCode(code: string): Promise<{
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        nativeName: string | null;
        phoneCode: string | null;
        isEU: boolean;
    } | null>;
}
