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
exports.CompanyDepartmentsController = void 0;
const common_1 = require("@nestjs/common");
const departments_service_1 = require("./departments.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const export_service_1 = require("../common/export/export.service");
let CompanyDepartmentsController = class CompanyDepartmentsController {
    departmentsService;
    exportService;
    constructor(departmentsService, exportService) {
        this.departmentsService = departmentsService;
        this.exportService = exportService;
    }
    create(companyId, dto) {
        return this.departmentsService.create(companyId, dto);
    }
    findAll(companyId) {
        return this.departmentsService.findAll(companyId);
    }
    async export(companyId, format = 'xlsx', res) {
        const { data } = await this.departmentsService.findAll(companyId);
        const columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Code', key: 'code', width: 12 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Manager First Name', key: 'manager.firstName', width: 20 },
            { header: 'Manager Last Name', key: 'manager.lastName', width: 20 },
            { header: 'Members', key: '_count.members', width: 12 },
            { header: 'Active', key: 'isActive', width: 10 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Departments');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="departments-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.departmentsService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.departmentsService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.departmentsService.remove(companyId, id);
    }
    getAvailableEmployees(companyId, id) {
        return this.departmentsService.getAvailableEmployees(companyId, id);
    }
    addMember(companyId, id, dto) {
        return this.departmentsService.addMember(companyId, id, dto);
    }
    updateMember(companyId, id, userId, dto) {
        return this.departmentsService.updateMember(companyId, id, userId, dto);
    }
    removeMember(companyId, id, userId) {
        return this.departmentsService.removeMember(companyId, id, userId);
    }
};
exports.CompanyDepartmentsController = CompanyDepartmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateDepartmentDto]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyDepartmentsController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateDepartmentDto]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/available-employees'),
    (0, permissions_guard_1.RequireView)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "getAvailableEmployees", null);
__decorate([
    (0, common_1.Post)(':id/members'),
    (0, permissions_guard_1.RequireEdit)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.AddMemberDto]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "addMember", null);
__decorate([
    (0, common_1.Patch)(':id/members/:userId'),
    (0, permissions_guard_1.RequireEdit)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('userId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, dto_1.UpdateMemberDto]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "updateMember", null);
__decorate([
    (0, common_1.Delete)(':id/members/:userId'),
    (0, permissions_guard_1.RequireEdit)('hr', 'departments'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CompanyDepartmentsController.prototype, "removeMember", null);
exports.CompanyDepartmentsController = CompanyDepartmentsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/departments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [departments_service_1.DepartmentsService,
        export_service_1.ExportService])
], CompanyDepartmentsController);
//# sourceMappingURL=company-departments.controller.js.map