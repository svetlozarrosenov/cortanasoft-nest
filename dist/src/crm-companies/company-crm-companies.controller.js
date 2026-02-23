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
exports.CompanyCrmCompaniesController = void 0;
const common_1 = require("@nestjs/common");
const crm_companies_service_1 = require("./crm-companies.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let CompanyCrmCompaniesController = class CompanyCrmCompaniesController {
    crmCompaniesService;
    constructor(crmCompaniesService) {
        this.crmCompaniesService = crmCompaniesService;
    }
    create(companyId, dto) {
        return this.crmCompaniesService.create(companyId, dto);
    }
    findAll(companyId, query) {
        return this.crmCompaniesService.findAll(companyId, query);
    }
    getIndustries() {
        return this.crmCompaniesService.getIndustries();
    }
    getTypes() {
        return this.crmCompaniesService.getTypes();
    }
    getSizes() {
        return this.crmCompaniesService.getSizes();
    }
    findOne(companyId, id) {
        return this.crmCompaniesService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.crmCompaniesService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.crmCompaniesService.remove(companyId, id);
    }
};
exports.CompanyCrmCompaniesController = CompanyCrmCompaniesController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('crm', 'companies'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateCrmCompanyDto]),
    __metadata("design:returntype", void 0)
], CompanyCrmCompaniesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('crm', 'companies'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryCrmCompaniesDto]),
    __metadata("design:returntype", void 0)
], CompanyCrmCompaniesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('industries'),
    (0, permissions_guard_1.RequireView)('crm', 'companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyCrmCompaniesController.prototype, "getIndustries", null);
__decorate([
    (0, common_1.Get)('types'),
    (0, permissions_guard_1.RequireView)('crm', 'companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyCrmCompaniesController.prototype, "getTypes", null);
__decorate([
    (0, common_1.Get)('sizes'),
    (0, permissions_guard_1.RequireView)('crm', 'companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyCrmCompaniesController.prototype, "getSizes", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('crm', 'companies'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyCrmCompaniesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('crm', 'companies'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateCrmCompanyDto]),
    __metadata("design:returntype", void 0)
], CompanyCrmCompaniesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('crm', 'companies'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyCrmCompaniesController.prototype, "remove", null);
exports.CompanyCrmCompaniesController = CompanyCrmCompaniesController = __decorate([
    (0, common_1.Controller)('companies/:companyId/crm-companies'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [crm_companies_service_1.CrmCompaniesService])
], CompanyCrmCompaniesController);
//# sourceMappingURL=company-crm-companies.controller.js.map