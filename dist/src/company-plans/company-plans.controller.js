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
exports.CompanyPlansController = void 0;
const common_1 = require("@nestjs/common");
const company_plans_service_1 = require("./company-plans.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const permissions_guard_2 = require("../common/guards/permissions.guard");
const client_1 = require("@prisma/client");
let CompanyPlansController = class CompanyPlansController {
    companyPlansService;
    constructor(companyPlansService) {
        this.companyPlansService = companyPlansService;
    }
    async create(companyId, req, dto) {
        const plan = await this.companyPlansService.create(companyId, req.user.id, dto);
        return {
            success: true,
            plan,
        };
    }
    async findAll(companyId, query) {
        const result = await this.companyPlansService.findAll(companyId, query);
        return {
            success: true,
            ...result,
        };
    }
    async findOne(companyId, id) {
        const plan = await this.companyPlansService.findOne(companyId, id);
        return {
            success: true,
            plan,
        };
    }
    async update(companyId, id, dto) {
        const plan = await this.companyPlansService.update(companyId, id, dto);
        return {
            success: true,
            plan,
        };
    }
    async remove(companyId, id) {
        const result = await this.companyPlansService.remove(companyId, id);
        return {
            success: true,
            ...result,
        };
    }
    async findByCompany(companyId, targetCompanyId) {
        const plans = await this.companyPlansService.findByCompany(companyId, targetCompanyId);
        return {
            success: true,
            plans,
        };
    }
    async updateStatus(companyId, id, status) {
        const plan = await this.companyPlansService.updateStatus(companyId, id, status);
        return {
            success: true,
            plan,
        };
    }
    async generateInvoice(companyId, id) {
        await this.companyPlansService.findOne(companyId, id);
        const invoice = await this.companyPlansService.generateInvoice(id);
        return {
            success: true,
            invoice,
        };
    }
};
exports.CompanyPlansController = CompanyPlansController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_2.RequireCreate)('admin', 'companyPlans'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateCompanyPlanDto]),
    __metadata("design:returntype", Promise)
], CompanyPlansController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_2.RequireView)('admin', 'companyPlans'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryCompanyPlanDto]),
    __metadata("design:returntype", Promise)
], CompanyPlansController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_2.RequireView)('admin', 'companyPlans'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CompanyPlansController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_2.RequireEdit)('admin', 'companyPlans'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateCompanyPlanDto]),
    __metadata("design:returntype", Promise)
], CompanyPlansController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_2.RequireDelete)('admin', 'companyPlans'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CompanyPlansController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('by-company/:targetCompanyId'),
    (0, permissions_guard_2.RequireView)('admin', 'companyPlans'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('targetCompanyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CompanyPlansController.prototype, "findByCompany", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, permissions_guard_2.RequireEdit)('admin', 'companyPlans'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CompanyPlansController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/generate-invoice'),
    (0, permissions_guard_2.RequireCreate)('admin', 'companyPlans'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CompanyPlansController.prototype, "generateInvoice", null);
exports.CompanyPlansController = CompanyPlansController = __decorate([
    (0, common_1.Controller)('companies/:companyId/plans'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [company_plans_service_1.CompanyPlansService])
], CompanyPlansController);
//# sourceMappingURL=company-plans.controller.js.map