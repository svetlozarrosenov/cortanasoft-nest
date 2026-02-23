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
exports.CompanyCustomersController = void 0;
const common_1 = require("@nestjs/common");
const customers_service_1 = require("./customers.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const export_service_1 = require("../common/export/export.service");
const client_1 = require("@prisma/client");
let CompanyCustomersController = class CompanyCustomersController {
    customersService;
    exportService;
    constructor(customersService, exportService) {
        this.customersService = customersService;
        this.exportService = exportService;
    }
    create(companyId, dto) {
        return this.customersService.create(companyId, dto);
    }
    findAll(companyId, query) {
        return this.customersService.findAll(companyId, query);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.customersService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'Company Name', key: 'companyName', width: 25 },
            { header: 'First Name', key: 'firstName', width: 20 },
            { header: 'Last Name', key: 'lastName', width: 20 },
            { header: 'Type', key: 'type', width: 12 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'EIK', key: 'eik', width: 15 },
            { header: 'VAT Number', key: 'vatNumber', width: 15 },
            { header: 'City', key: 'city', width: 15 },
            { header: 'Stage', key: 'stage', width: 12 },
            { header: 'Active', key: 'isActive', width: 10 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Customers');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    getStages() {
        return Object.values(client_1.CustomerStage);
    }
    getSources() {
        return Object.values(client_1.CustomerSource);
    }
    findOne(companyId, id) {
        return this.customersService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.customersService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.customersService.remove(companyId, id);
    }
};
exports.CompanyCustomersController = CompanyCustomersController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('crm', 'customers'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateCustomerDto]),
    __metadata("design:returntype", void 0)
], CompanyCustomersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('crm', 'customers'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryCustomersDto]),
    __metadata("design:returntype", void 0)
], CompanyCustomersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('crm', 'customers'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryCustomersDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyCustomersController.prototype, "export", null);
__decorate([
    (0, common_1.Get)('stages'),
    (0, permissions_guard_1.RequireView)('crm', 'customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyCustomersController.prototype, "getStages", null);
__decorate([
    (0, common_1.Get)('sources'),
    (0, permissions_guard_1.RequireView)('crm', 'customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyCustomersController.prototype, "getSources", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('crm', 'customers'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyCustomersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('crm', 'customers'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateCustomerDto]),
    __metadata("design:returntype", void 0)
], CompanyCustomersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('crm', 'customers'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyCustomersController.prototype, "remove", null);
exports.CompanyCustomersController = CompanyCustomersController = __decorate([
    (0, common_1.Controller)('companies/:companyId/customers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [customers_service_1.CustomersService,
        export_service_1.ExportService])
], CompanyCustomersController);
//# sourceMappingURL=company-customers.controller.js.map