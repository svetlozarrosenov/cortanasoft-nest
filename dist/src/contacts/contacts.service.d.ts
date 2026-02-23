import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, UpdateContactDto, QueryContactsDto } from './dto';
export declare class ContactsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateContactDto): Promise<{
        customer: {
            id: string;
            type: import(".prisma/client").$Enums.CustomerType;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        email: string | null;
        companyId: string;
        firstName: string;
        lastName: string;
        department: string | null;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        isPrimary: boolean;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        birthDate: Date | null;
    }>;
    findAll(companyId: string, query: QueryContactsDto): Promise<{
        data: ({
            customer: {
                id: string;
                type: import(".prisma/client").$Enums.CustomerType;
                firstName: string | null;
                lastName: string | null;
                companyName: string | null;
            };
        } & {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            phone: string | null;
            email: string | null;
            companyId: string;
            firstName: string;
            lastName: string;
            department: string | null;
            customerId: string;
            notes: string | null;
            mobile: string | null;
            isPrimary: boolean;
            jobTitle: string | null;
            linkedIn: string | null;
            skype: string | null;
            birthDate: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        customer: {
            id: string;
            type: import(".prisma/client").$Enums.CustomerType;
            phone: string | null;
            email: string | null;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        email: string | null;
        companyId: string;
        firstName: string;
        lastName: string;
        department: string | null;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        isPrimary: boolean;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        birthDate: Date | null;
    }>;
    update(companyId: string, id: string, dto: UpdateContactDto): Promise<{
        customer: {
            id: string;
            type: import(".prisma/client").$Enums.CustomerType;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        email: string | null;
        companyId: string;
        firstName: string;
        lastName: string;
        department: string | null;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        isPrimary: boolean;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        birthDate: Date | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        message: string;
    }>;
    setAsPrimary(companyId: string, id: string): Promise<{
        customer: {
            id: string;
            type: import(".prisma/client").$Enums.CustomerType;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        email: string | null;
        companyId: string;
        firstName: string;
        lastName: string;
        department: string | null;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        isPrimary: boolean;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        birthDate: Date | null;
    }>;
    findByCustomer(companyId: string, customerId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        email: string | null;
        companyId: string;
        firstName: string;
        lastName: string;
        department: string | null;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        isPrimary: boolean;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        birthDate: Date | null;
    }[]>;
}
