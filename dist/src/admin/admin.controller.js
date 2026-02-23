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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const super_admin_guard_1 = require("../common/guards/super-admin.guard");
const create_company_dto_1 = require("./dto/create-company.dto");
const update_company_dto_1 = require("./dto/update-company.dto");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const create_role_dto_1 = require("./dto/create-role.dto");
const update_role_dto_1 = require("./dto/update-role.dto");
const assign_user_to_company_dto_1 = require("./dto/assign-user-to-company.dto");
const prisma_service_1 = require("../prisma/prisma.service");
const company_plans_service_1 = require("../company-plans/company-plans.service");
const dto_1 = require("../company-plans/dto");
const client_1 = require("@prisma/client");
let AdminController = class AdminController {
    adminService;
    prisma;
    companyPlansService;
    constructor(adminService, prisma, companyPlansService) {
        this.adminService = adminService;
        this.prisma = prisma;
        this.companyPlansService = companyPlansService;
    }
    async getAllCompanies() {
        const companies = await this.adminService.findAllCompanies();
        return {
            success: true,
            companies,
        };
    }
    async getCompanyById(id) {
        const company = await this.adminService.findCompanyById(id);
        return {
            success: true,
            company,
        };
    }
    async createCompany(dto) {
        const company = await this.adminService.createCompany(dto);
        return {
            success: true,
            company,
        };
    }
    async updateCompany(id, dto) {
        const company = await this.adminService.updateCompany(id, dto);
        return {
            success: true,
            company,
        };
    }
    async deleteCompany(id) {
        await this.adminService.deleteCompany(id);
        return {
            success: true,
            message: 'Company deleted successfully',
        };
    }
    async getAllUsers() {
        const users = await this.adminService.findAllUsers();
        return {
            success: true,
            users,
        };
    }
    async getUserById(id) {
        const user = await this.adminService.findUserById(id);
        return {
            success: true,
            user,
        };
    }
    async createUser(dto) {
        const user = await this.adminService.createUser(dto);
        return {
            success: true,
            user,
        };
    }
    async updateUser(id, dto) {
        const user = await this.adminService.updateUser(id, dto);
        return {
            success: true,
            user,
        };
    }
    async deleteUser(id) {
        await this.adminService.deleteUser(id);
        return {
            success: true,
            message: 'User deleted successfully',
        };
    }
    async getRolesByCompany(companyId) {
        const roles = await this.adminService.findRolesByCompany(companyId);
        return {
            success: true,
            roles,
        };
    }
    async getRoleById(id) {
        const role = await this.adminService.findRoleById(id);
        return {
            success: true,
            role,
        };
    }
    async createRole(dto) {
        const role = await this.adminService.createRole(dto);
        return {
            success: true,
            role,
        };
    }
    async updateRole(id, dto) {
        const role = await this.adminService.updateRole(id, dto);
        return {
            success: true,
            role,
        };
    }
    async deleteRole(id) {
        await this.adminService.deleteRole(id);
        return {
            success: true,
            message: 'Role deleted successfully',
        };
    }
    async getUsersByCompany(companyId) {
        const users = await this.adminService.findUsersByCompany(companyId);
        return {
            success: true,
            users,
        };
    }
    async getAvailableUsersForCompany(companyId) {
        const users = await this.adminService.findUsersNotInCompany(companyId);
        return {
            success: true,
            users,
        };
    }
    async assignUserToCompany(companyId, dto) {
        const userCompany = await this.adminService.assignUserToCompany(companyId, dto.userId, dto.roleId, dto.isDefault);
        return {
            success: true,
            userCompany,
        };
    }
    async updateUserCompanyRole(companyId, userId, roleId) {
        const userCompany = await this.adminService.updateUserCompanyRole(companyId, userId, roleId);
        return {
            success: true,
            userCompany,
        };
    }
    async removeUserFromCompany(companyId, userId) {
        await this.adminService.removeUserFromCompany(companyId, userId);
        return {
            success: true,
            message: 'User removed from company successfully',
        };
    }
    async getCompanyPlans(companyId) {
        const plans = await this.prisma.companyPlan.findMany({
            where: { companyId },
            include: {
                currency: true,
                items: {
                    include: {
                        product: {
                            select: { id: true, sku: true, name: true, unit: true },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
                _count: { select: { items: true, generatedInvoices: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            success: true,
            plans,
        };
    }
    async getCompanyPlan(id) {
        const adminCompany = await this.prisma.company.findFirst({
            where: { role: 'OWNER' },
        });
        if (!adminCompany) {
            throw new Error('Admin company not found');
        }
        const plan = await this.companyPlansService.findOne(adminCompany.id, id);
        return {
            success: true,
            plan,
        };
    }
    async createCompanyPlan(req, dto) {
        const adminCompany = await this.prisma.company.findFirst({
            where: { role: 'OWNER' },
        });
        if (!adminCompany) {
            throw new Error('Admin company not found');
        }
        const plan = await this.companyPlansService.create(adminCompany.id, req.user.id, dto);
        return {
            success: true,
            plan,
        };
    }
    async updateCompanyPlan(id, dto) {
        const adminCompany = await this.prisma.company.findFirst({
            where: { role: 'OWNER' },
        });
        if (!adminCompany) {
            throw new Error('Admin company not found');
        }
        const plan = await this.companyPlansService.update(adminCompany.id, id, dto);
        return {
            success: true,
            plan,
        };
    }
    async updateCompanyPlanStatus(id, status) {
        const adminCompany = await this.prisma.company.findFirst({
            where: { role: 'OWNER' },
        });
        if (!adminCompany) {
            throw new Error('Admin company not found');
        }
        const plan = await this.companyPlansService.updateStatus(adminCompany.id, id, status);
        return {
            success: true,
            plan,
        };
    }
    async generatePlanInvoice(id) {
        const invoice = await this.companyPlansService.generateInvoice(id);
        return {
            success: true,
            invoice,
        };
    }
    async deleteCompanyPlan(id) {
        const adminCompany = await this.prisma.company.findFirst({
            where: { role: 'OWNER' },
        });
        if (!adminCompany) {
            throw new Error('Admin company not found');
        }
        const result = await this.companyPlansService.remove(adminCompany.id, id);
        return {
            success: true,
            ...result,
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllCompanies", null);
__decorate([
    (0, common_1.Get)('companies/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getCompanyById", null);
__decorate([
    (0, common_1.Post)('companies'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_company_dto_1.CreateCompanyDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createCompany", null);
__decorate([
    (0, common_1.Put)('companies/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_company_dto_1.UpdateCompanyDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateCompany", null);
__decorate([
    (0, common_1.Delete)('companies/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteCompany", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserById", null);
__decorate([
    (0, common_1.Post)('users'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createUser", null);
__decorate([
    (0, common_1.Put)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/roles'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRolesByCompany", null);
__decorate([
    (0, common_1.Get)('roles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRoleById", null);
__decorate([
    (0, common_1.Post)('roles'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_role_dto_1.CreateRoleDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createRole", null);
__decorate([
    (0, common_1.Put)('roles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_role_dto_1.UpdateRoleDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)('roles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteRole", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/users'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsersByCompany", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/available-users'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAvailableUsersForCompany", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/users'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_user_to_company_dto_1.AssignUserToCompanyDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "assignUserToCompany", null);
__decorate([
    (0, common_1.Put)('companies/:companyId/users/:userId'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)('roleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserCompanyRole", null);
__decorate([
    (0, common_1.Delete)('companies/:companyId/users/:userId'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "removeUserFromCompany", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/plans'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getCompanyPlans", null);
__decorate([
    (0, common_1.Get)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getCompanyPlan", null);
__decorate([
    (0, common_1.Post)('plans'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateCompanyPlanDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createCompanyPlan", null);
__decorate([
    (0, common_1.Put)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateCompanyPlanDto]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateCompanyPlan", null);
__decorate([
    (0, common_1.Put)('plans/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateCompanyPlanStatus", null);
__decorate([
    (0, common_1.Post)('plans/:id/generate-invoice'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "generatePlanInvoice", null);
__decorate([
    (0, common_1.Delete)('plans/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteCompanyPlan", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, super_admin_guard_1.SuperAdminGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        prisma_service_1.PrismaService,
        company_plans_service_1.CompanyPlansService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map