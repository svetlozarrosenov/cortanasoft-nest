import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto, AddMemberDto, UpdateMemberDto } from './dto';
export declare class DepartmentsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(companyId: string, dto: CreateDepartmentDto): Promise<{
        _count: {
            members: number;
        };
        parent: {
            id: string;
            name: string;
        } | null;
        children: {
            id: string;
            name: string;
        }[];
    } & {
        id: string;
        code: string | null;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        companyId: string;
        parentId: string | null;
        managerId: string | null;
    }>;
    findAll(companyId: string): Promise<{
        data: {
            members: {
                user: {
                    id: string;
                    isActive: boolean;
                    email: string;
                    firstName: string;
                    lastName: string;
                } | null;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                companyId: string;
                userId: string;
                position: string | null;
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
                id: string;
                name: string;
            } | null;
            children: {
                id: string;
                name: string;
                isActive: boolean;
            }[];
            id: string;
            code: string | null;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            companyId: string;
            parentId: string | null;
            managerId: string | null;
        }[];
        meta: {
            total: number;
        };
    }>;
    findOne(companyId: string, id: string): Promise<{
        members: {
            user: {
                id: string;
                isActive: boolean;
                email: string;
                firstName: string;
                lastName: string;
            } | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            userId: string;
            position: string | null;
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
            id: string;
            name: string;
        } | null;
        children: {
            id: string;
            name: string;
            isActive: boolean;
        }[];
        id: string;
        code: string | null;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        companyId: string;
        parentId: string | null;
        managerId: string | null;
    }>;
    update(companyId: string, id: string, dto: UpdateDepartmentDto): Promise<{
        _count: {
            members: number;
        };
        parent: {
            id: string;
            name: string;
        } | null;
    } & {
        id: string;
        code: string | null;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        companyId: string;
        parentId: string | null;
        managerId: string | null;
    }>;
    remove(companyId: string, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    addMember(companyId: string, departmentId: string, dto: AddMemberDto): Promise<{
        user: {
            id: string;
            isActive: boolean;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        userId: string;
        position: string | null;
        isHead: boolean;
        joinedAt: Date;
        departmentId: string;
    }>;
    updateMember(companyId: string, departmentId: string, userId: string, dto: UpdateMemberDto): Promise<{
        user: {
            id: string;
            isActive: boolean;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        userId: string;
        position: string | null;
        isHead: boolean;
        joinedAt: Date;
        departmentId: string;
    }>;
    removeMember(companyId: string, departmentId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getAvailableEmployees(companyId: string, departmentId: string): Promise<{
        role: {
            id: string;
            name: string;
        };
        id: string;
        isActive: boolean;
        email: string;
        firstName: string;
        lastName: string;
    }[]>;
}
