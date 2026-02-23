"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DepartmentsService = class DepartmentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, dto) {
        if (dto.code) {
            const existing = await this.prisma.department.findUnique({
                where: {
                    companyId_code: {
                        companyId,
                        code: dto.code,
                    },
                },
            });
            if (existing) {
                throw new common_1.ConflictException('Department code already exists in this company');
            }
        }
        if (dto.parentId) {
            const parent = await this.prisma.department.findFirst({
                where: { id: dto.parentId, companyId },
            });
            if (!parent) {
                throw new common_1.NotFoundException('Parent department not found');
            }
        }
        if (dto.managerId) {
            const userCompany = await this.prisma.userCompany.findFirst({
                where: { userId: dto.managerId, companyId },
            });
            if (!userCompany) {
                throw new common_1.BadRequestException('Manager is not an employee of this company');
            }
        }
        const department = await this.prisma.department.create({
            data: {
                name: dto.name,
                description: dto.description,
                code: dto.code,
                parentId: dto.parentId,
                managerId: dto.managerId,
                isActive: dto.isActive ?? true,
                companyId,
            },
            include: {
                parent: {
                    select: { id: true, name: true },
                },
                children: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { members: true },
                },
            },
        });
        return department;
    }
    async findAll(companyId) {
        const departments = await this.prisma.department.findMany({
            where: { companyId },
            include: {
                parent: {
                    select: { id: true, name: true },
                },
                children: {
                    select: { id: true, name: true, isActive: true },
                },
                members: {
                    include: {
                        department: false,
                    },
                },
                _count: {
                    select: { members: true, children: true },
                },
            },
            orderBy: [{ name: 'asc' }],
        });
        const enrichedDepartments = await Promise.all(departments.map(async (dept) => {
            const membersWithUsers = await Promise.all(dept.members.map(async (member) => {
                const user = await this.prisma.user.findUnique({
                    where: { id: member.userId },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        isActive: true,
                    },
                });
                return { ...member, user };
            }));
            let manager = null;
            if (dept.managerId) {
                manager = await this.prisma.user.findUnique({
                    where: { id: dept.managerId },
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                });
            }
            return {
                ...dept,
                members: membersWithUsers,
                manager,
            };
        }));
        return {
            data: enrichedDepartments,
            meta: {
                total: departments.length,
            },
        };
    }
    async findOne(companyId, id) {
        const department = await this.prisma.department.findFirst({
            where: { id, companyId },
            include: {
                parent: {
                    select: { id: true, name: true },
                },
                children: {
                    select: { id: true, name: true, isActive: true },
                },
                members: true,
                _count: {
                    select: { members: true, children: true },
                },
            },
        });
        if (!department) {
            throw new common_1.NotFoundException('Department not found');
        }
        const membersWithUsers = await Promise.all(department.members.map(async (member) => {
            const user = await this.prisma.user.findUnique({
                where: { id: member.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                },
            });
            return { ...member, user };
        }));
        let manager = null;
        if (department.managerId) {
            manager = await this.prisma.user.findUnique({
                where: { id: department.managerId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            });
        }
        return {
            ...department,
            members: membersWithUsers,
            manager,
        };
    }
    async update(companyId, id, dto) {
        const department = await this.prisma.department.findFirst({
            where: { id, companyId },
        });
        if (!department) {
            throw new common_1.NotFoundException('Department not found');
        }
        if (dto.code && dto.code !== department.code) {
            const existing = await this.prisma.department.findFirst({
                where: {
                    companyId,
                    code: dto.code,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new common_1.ConflictException('Department code already exists');
            }
        }
        if (dto.parentId && dto.parentId !== department.parentId) {
            if (dto.parentId === id) {
                throw new common_1.BadRequestException('Department cannot be its own parent');
            }
            const parent = await this.prisma.department.findFirst({
                where: { id: dto.parentId, companyId },
            });
            if (!parent) {
                throw new common_1.NotFoundException('Parent department not found');
            }
        }
        if (dto.managerId && dto.managerId !== department.managerId) {
            const userCompany = await this.prisma.userCompany.findFirst({
                where: { userId: dto.managerId, companyId },
            });
            if (!userCompany) {
                throw new common_1.BadRequestException('Manager is not an employee of this company');
            }
        }
        const updated = await this.prisma.department.update({
            where: { id },
            data: {
                name: dto.name,
                description: dto.description,
                code: dto.code,
                parentId: dto.parentId,
                managerId: dto.managerId,
                isActive: dto.isActive,
            },
            include: {
                parent: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { members: true },
                },
            },
        });
        return updated;
    }
    async remove(companyId, id) {
        const department = await this.prisma.department.findFirst({
            where: { id, companyId },
            include: {
                _count: {
                    select: { members: true, children: true },
                },
            },
        });
        if (!department) {
            throw new common_1.NotFoundException('Department not found');
        }
        if (department._count.children > 0) {
            throw new common_1.BadRequestException('Cannot delete department with sub-departments. Delete or reassign them first.');
        }
        await this.prisma.department.delete({
            where: { id },
        });
        return { success: true, message: 'Department deleted' };
    }
    async addMember(companyId, departmentId, dto) {
        const department = await this.prisma.department.findFirst({
            where: { id: departmentId, companyId },
        });
        if (!department) {
            throw new common_1.NotFoundException('Department not found');
        }
        const userCompany = await this.prisma.userCompany.findFirst({
            where: { userId: dto.userId, companyId },
        });
        if (!userCompany) {
            throw new common_1.BadRequestException('User is not an employee of this company');
        }
        const existingMember = await this.prisma.departmentMember.findUnique({
            where: {
                departmentId_userId: {
                    departmentId,
                    userId: dto.userId,
                },
            },
        });
        if (existingMember) {
            throw new common_1.ConflictException('User is already a member of this department');
        }
        if (dto.isHead) {
            await this.prisma.departmentMember.updateMany({
                where: { departmentId, isHead: true },
                data: { isHead: false },
            });
        }
        const member = await this.prisma.departmentMember.create({
            data: {
                departmentId,
                userId: dto.userId,
                companyId,
                position: dto.position,
                isHead: dto.isHead ?? false,
            },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
            },
        });
        return { ...member, user };
    }
    async updateMember(companyId, departmentId, userId, dto) {
        const member = await this.prisma.departmentMember.findFirst({
            where: { departmentId, userId, companyId },
        });
        if (!member) {
            throw new common_1.NotFoundException('Member not found in this department');
        }
        if (dto.isHead) {
            await this.prisma.departmentMember.updateMany({
                where: { departmentId, isHead: true, NOT: { userId } },
                data: { isHead: false },
            });
        }
        const updated = await this.prisma.departmentMember.update({
            where: { id: member.id },
            data: {
                position: dto.position,
                isHead: dto.isHead,
            },
        });
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                isActive: true,
            },
        });
        return { ...updated, user };
    }
    async removeMember(companyId, departmentId, userId) {
        const member = await this.prisma.departmentMember.findFirst({
            where: { departmentId, userId, companyId },
        });
        if (!member) {
            throw new common_1.NotFoundException('Member not found in this department');
        }
        await this.prisma.departmentMember.delete({
            where: { id: member.id },
        });
        return { success: true, message: 'Member removed from department' };
    }
    async getAvailableEmployees(companyId, departmentId) {
        const existingMembers = await this.prisma.departmentMember.findMany({
            where: { departmentId },
            select: { userId: true },
        });
        const existingUserIds = existingMembers.map((m) => m.userId);
        const userCompanies = await this.prisma.userCompany.findMany({
            where: {
                companyId,
                userId: { notIn: existingUserIds },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        isActive: true,
                    },
                },
                role: {
                    select: { id: true, name: true },
                },
            },
        });
        return userCompanies.map((uc) => ({
            ...uc.user,
            role: uc.role,
        }));
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map