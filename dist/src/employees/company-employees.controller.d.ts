import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { EmployeesService } from './employees.service';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
export declare class CompanyEmployeesController {
    private readonly employeesService;
    private readonly exportService;
    constructor(employeesService: EmployeesService, exportService: ExportService);
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
    export(companyId: string, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    findOne(companyId: string, id: string): Promise<{
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
