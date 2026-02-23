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
exports.CompanyLeavesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const leaves_service_1 = require("./leaves.service");
const dto_1 = require("./dto");
const export_service_1 = require("../common/export/export.service");
let CompanyLeavesController = class CompanyLeavesController {
    leavesService;
    exportService;
    constructor(leavesService, exportService) {
        this.leavesService = leavesService;
        this.exportService = exportService;
    }
    async create(companyId, dto, req) {
        return this.leavesService.create(companyId, req.user.id, dto);
    }
    async findAll(companyId, query) {
        return this.leavesService.findAll(companyId, query);
    }
    async getSummary(companyId) {
        return this.leavesService.getSummary(companyId);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.leavesService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'First Name', key: 'user.firstName', width: 20 },
            { header: 'Last Name', key: 'user.lastName', width: 20 },
            { header: 'Type', key: 'type', width: 12 },
            { header: 'Start Date', key: 'startDate', width: 15 },
            { header: 'End Date', key: 'endDate', width: 15 },
            { header: 'Days', key: 'days', width: 10 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Reason', key: 'reason', width: 30 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Leaves');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="leaves-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    async getMyLeaves(companyId, query, req) {
        return this.leavesService.getMyLeaves(companyId, req.user.id, query);
    }
    async getMyBalance(companyId, year, req) {
        return this.leavesService.getBalance(companyId, req.user.id, year ? parseInt(year) : undefined);
    }
    async getBalance(companyId, userId, year) {
        return this.leavesService.getBalance(companyId, userId, year ? parseInt(year) : undefined);
    }
    async findOne(companyId, id) {
        return this.leavesService.findOne(companyId, id);
    }
    async update(companyId, id, dto, req) {
        return this.leavesService.update(companyId, id, req.user.id, dto);
    }
    async approve(companyId, id, req) {
        return this.leavesService.approve(companyId, id, req.user.id);
    }
    async reject(companyId, id, dto, req) {
        return this.leavesService.reject(companyId, id, req.user.id, dto);
    }
    async cancel(companyId, id, req) {
        return this.leavesService.cancel(companyId, id, req.user.id);
    }
    async remove(companyId, id, req) {
        return this.leavesService.remove(companyId, id, req.user.id);
    }
};
exports.CompanyLeavesController = CompanyLeavesController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateLeaveDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryLeavesDto]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_guard_1.RequireView)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryLeavesDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "export", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryLeavesDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "getMyLeaves", null);
__decorate([
    (0, common_1.Get)('my/balance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "getMyBalance", null);
__decorate([
    (0, common_1.Get)('balance/:userId'),
    (0, permissions_guard_1.RequireView)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateLeaveDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, permissions_guard_1.RequireEdit)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, permissions_guard_1.RequireEdit)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.RejectLeaveDto, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_guard_1.RequireEdit)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('hr', 'leaves'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeavesController.prototype, "remove", null);
exports.CompanyLeavesController = CompanyLeavesController = __decorate([
    (0, common_1.Controller)('companies/:companyId/leaves'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [leaves_service_1.LeavesService,
        export_service_1.ExportService])
], CompanyLeavesController);
//# sourceMappingURL=company-leaves.controller.js.map