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
exports.CompanyEmployeesController = void 0;
const common_1 = require("@nestjs/common");
const employees_service_1 = require("./employees.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const export_service_1 = require("../common/export/export.service");
let CompanyEmployeesController = class CompanyEmployeesController {
    employeesService;
    exportService;
    constructor(employeesService, exportService) {
        this.employeesService = employeesService;
        this.exportService = exportService;
    }
    findAll(companyId) {
        return this.employeesService.findAll(companyId);
    }
    async export(companyId, format = 'xlsx', res) {
        const result = await this.employeesService.findAll(companyId);
        const data = result.data || result;
        const columns = [
            { header: 'First Name', key: 'user.firstName', width: 20 },
            { header: 'Last Name', key: 'user.lastName', width: 20 },
            { header: 'Email', key: 'user.email', width: 25 },
            { header: 'Role', key: 'role.name', width: 20 },
            { header: 'Active', key: 'isActive', width: 10 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Employees');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.employeesService.findOne(companyId, id);
    }
};
exports.CompanyEmployeesController = CompanyEmployeesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyEmployeesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyEmployeesController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyEmployeesController.prototype, "findOne", null);
exports.CompanyEmployeesController = CompanyEmployeesController = __decorate([
    (0, common_1.Controller)('companies/:companyId/employees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard),
    __metadata("design:paramtypes", [employees_service_1.EmployeesService,
        export_service_1.ExportService])
], CompanyEmployeesController);
//# sourceMappingURL=company-employees.controller.js.map