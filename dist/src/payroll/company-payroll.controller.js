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
exports.CompanyPayrollController = void 0;
const common_1 = require("@nestjs/common");
const payroll_service_1 = require("./payroll.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const export_service_1 = require("../common/export/export.service");
let CompanyPayrollController = class CompanyPayrollController {
    payrollService;
    exportService;
    constructor(payrollService, exportService) {
        this.payrollService = payrollService;
        this.exportService = exportService;
    }
    create(companyId, dto) {
        return this.payrollService.create(companyId, dto);
    }
    findAll(companyId, query) {
        return this.payrollService.findAll(companyId, query);
    }
    getSummary(companyId, year, month) {
        return this.payrollService.getSummary(companyId, parseInt(year), month ? parseInt(month) : undefined);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.payrollService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'First Name', key: 'user.firstName', width: 20 },
            { header: 'Last Name', key: 'user.lastName', width: 20 },
            { header: 'Year', key: 'year', width: 10 },
            { header: 'Month', key: 'month', width: 10 },
            { header: 'Gross Salary', key: 'grossSalary', width: 15 },
            { header: 'Net Salary', key: 'netSalary', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Payroll');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="payroll-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.payrollService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.payrollService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.payrollService.remove(companyId, id);
    }
    approve(companyId, id, req) {
        return this.payrollService.approve(companyId, id, req.user.id);
    }
    markAsPaid(companyId, id, body) {
        return this.payrollService.markAsPaid(companyId, id, body.paymentReference);
    }
    cancel(companyId, id) {
        return this.payrollService.cancel(companyId, id);
    }
    generateBulk(companyId, body) {
        return this.payrollService.generateBulk(companyId, body.year, body.month, body.defaultBaseSalary);
    }
};
exports.CompanyPayrollController = CompanyPayrollController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreatePayrollDto]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryPayrollDto]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_guard_1.RequireView)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryPayrollDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyPayrollController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdatePayrollDto]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_guard_1.RequireEdit)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/pay'),
    (0, permissions_guard_1.RequireEdit)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "markAsPaid", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_guard_1.RequireEdit)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "cancel", null);
__decorate([
    (0, common_1.Post)('generate-bulk'),
    (0, permissions_guard_1.RequireCreate)('hr', 'payroll'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CompanyPayrollController.prototype, "generateBulk", null);
exports.CompanyPayrollController = CompanyPayrollController = __decorate([
    (0, common_1.Controller)('companies/:companyId/payroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService,
        export_service_1.ExportService])
], CompanyPayrollController);
//# sourceMappingURL=company-payroll.controller.js.map