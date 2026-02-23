import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ContactsService } from './contacts.service';
import { CreateContactDto, UpdateContactDto, QueryContactsDto } from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
export declare class CompanyContactsController {
    private readonly contactsService;
    private readonly exportService;
    constructor(contactsService: ContactsService, exportService: ExportService);
    create(companyId: string, dto: CreateContactDto): Promise<{
        customer: {
            type: import(".prisma/client").$Enums.CustomerType;
            id: string;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        };
    } & {
        email: string | null;
        phone: string | null;
        createdAt: Date;
        department: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        firstName: string;
        lastName: string;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        isPrimary: boolean;
        birthDate: Date | null;
    }>;
    findAll(companyId: string, query: QueryContactsDto): Promise<{
        data: ({
            customer: {
                type: import(".prisma/client").$Enums.CustomerType;
                id: string;
                firstName: string | null;
                lastName: string | null;
                companyName: string | null;
            };
        } & {
            email: string | null;
            phone: string | null;
            createdAt: Date;
            department: string | null;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            companyId: string;
            firstName: string;
            lastName: string;
            customerId: string;
            notes: string | null;
            mobile: string | null;
            jobTitle: string | null;
            linkedIn: string | null;
            skype: string | null;
            isPrimary: boolean;
            birthDate: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    export(companyId: string, query: QueryContactsDto, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    findByCustomer(companyId: string, customerId: string): Promise<{
        email: string | null;
        phone: string | null;
        createdAt: Date;
        department: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        firstName: string;
        lastName: string;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        isPrimary: boolean;
        birthDate: Date | null;
    }[]>;
    findOne(companyId: string, id: string): Promise<{
        customer: {
            email: string | null;
            phone: string | null;
            type: import(".prisma/client").$Enums.CustomerType;
            id: string;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        };
    } & {
        email: string | null;
        phone: string | null;
        createdAt: Date;
        department: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        firstName: string;
        lastName: string;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        isPrimary: boolean;
        birthDate: Date | null;
    }>;
    update(companyId: string, id: string, dto: UpdateContactDto): Promise<{
        customer: {
            type: import(".prisma/client").$Enums.CustomerType;
            id: string;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        };
    } & {
        email: string | null;
        phone: string | null;
        createdAt: Date;
        department: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        firstName: string;
        lastName: string;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        isPrimary: boolean;
        birthDate: Date | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        message: string;
    }>;
    setAsPrimary(companyId: string, id: string): Promise<{
        customer: {
            type: import(".prisma/client").$Enums.CustomerType;
            id: string;
            firstName: string | null;
            lastName: string | null;
            companyName: string | null;
        };
    } & {
        email: string | null;
        phone: string | null;
        createdAt: Date;
        department: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        firstName: string;
        lastName: string;
        customerId: string;
        notes: string | null;
        mobile: string | null;
        jobTitle: string | null;
        linkedIn: string | null;
        skype: string | null;
        isPrimary: boolean;
        birthDate: Date | null;
    }>;
}
