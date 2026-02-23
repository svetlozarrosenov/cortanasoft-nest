import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto, AddMemberDto, UpdateMemberDto } from './dto';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
export declare class CompanyDepartmentsController {
    private readonly departmentsService;
    private readonly exportService;
    constructor(departmentsService: DepartmentsService, exportService: ExportService);
    create(companyId: string, dto: CreateDepartmentDto): Promise<{
        _count: {
            members: number;
        };
        parent: {
            name: string;
            id: string;
        } | null;
        children: {
            name: string;
            id: string;
        }[];
    } & {
        name: string;
        createdAt: Date;
        description: string | null;
        code: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        parentId: string | null;
        managerId: string | null;
    }>;
    findAll(companyId: string): Promise<{
        data: {
            members: {
                user: {
                    email: string;
                    id: string;
                    isActive: boolean;
                    firstName: string;
                    lastName: string;
                } | null;
                createdAt: Date;
                position: string | null;
                updatedAt: Date;
                id: string;
                companyId: string;
                userId: string;
                isHead: boolean;
                joinedAt: Date;
                departmentId: string;
            }[];
            manager: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
            _count: {
                children: number;
                members: number;
            };
            parent: {
                name: string;
                id: string;
            } | null;
            children: {
                name: string;
                id: string;
                isActive: boolean;
            }[];
            name: string;
            createdAt: Date;
            description: string | null;
            code: string | null;
            updatedAt: Date;
            id: string;
            isActive: boolean;
            companyId: string;
            parentId: string | null;
            managerId: string | null;
        }[];
        meta: {
            total: number;
        };
    }>;
    export(companyId: string, format: ExportFormat | undefined, res: Response): Promise<StreamableFile>;
    findOne(companyId: string, id: string): Promise<{
        members: {
            user: {
                email: string;
                id: string;
                isActive: boolean;
                firstName: string;
                lastName: string;
            } | null;
            createdAt: Date;
            position: string | null;
            updatedAt: Date;
            id: string;
            companyId: string;
            userId: string;
            isHead: boolean;
            joinedAt: Date;
            departmentId: string;
        }[];
        manager: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        _count: {
            children: number;
            members: number;
        };
        parent: {
            name: string;
            id: string;
        } | null;
        children: {
            name: string;
            id: string;
            isActive: boolean;
        }[];
        name: string;
        createdAt: Date;
        description: string | null;
        code: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        parentId: string | null;
        managerId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateDepartmentDto): Promise<{
        _count: {
            members: number;
        };
        parent: {
            name: string;
            id: string;
        } | null;
    } & {
        name: string;
        createdAt: Date;
        description: string | null;
        code: string | null;
        updatedAt: Date;
        id: string;
        isActive: boolean;
        companyId: string;
        parentId: string | null;
        managerId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getAvailableEmployees(companyId: string, id: string): Promise<{
        role: {
            name: string;
            id: string;
        };
        email: string;
        id: string;
        isActive: boolean;
        firstName: string;
        lastName: string;
    }[]>;
    addMember(companyId: string, id: string, dto: AddMemberDto): Promise<{
        user: {
            email: string;
            id: string;
            isActive: boolean;
            firstName: string;
            lastName: string;
        } | null;
        createdAt: Date;
        position: string | null;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        isHead: boolean;
        joinedAt: Date;
        departmentId: string;
    }>;
    updateMember(companyId: string, id: string, userId: string, dto: UpdateMemberDto): Promise<{
        user: {
            email: string;
            id: string;
            isActive: boolean;
            firstName: string;
            lastName: string;
        } | null;
        createdAt: Date;
        position: string | null;
        updatedAt: Date;
        id: string;
        companyId: string;
        userId: string;
        isHead: boolean;
        joinedAt: Date;
        departmentId: string;
    }>;
    removeMember(companyId: string, id: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
