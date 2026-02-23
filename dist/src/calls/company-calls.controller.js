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
exports.CompanyCallsController = void 0;
const common_1 = require("@nestjs/common");
const calls_service_1 = require("./calls.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const export_service_1 = require("../common/export/export.service");
let CompanyCallsController = class CompanyCallsController {
    callsService;
    exportService;
    constructor(callsService, exportService) {
        this.callsService = callsService;
        this.exportService = exportService;
    }
    create(companyId, req, createCallDto) {
        return this.callsService.create(companyId, req.user.id, createCallDto);
    }
    findAll(companyId, query) {
        return this.callsService.findAll(companyId, query);
    }
    getDirections() {
        return this.callsService.getDirections();
    }
    getOutcomes() {
        return this.callsService.getOutcomes();
    }
    getStatistics(companyId) {
        return this.callsService.getStatistics(companyId);
    }
    getUpcomingCalls(companyId, req, limit, allUsers) {
        const userId = allUsers === 'true' ? undefined : req.user.id;
        return this.callsService.getUpcomingCalls(companyId, userId, limit ? parseInt(limit) : 10);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const result = await this.callsService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const data = result.items;
        const columns = [
            { header: 'Subject', key: 'subject', width: 25 },
            { header: 'Direction', key: 'direction', width: 12 },
            { header: 'Outcome', key: 'outcome', width: 15 },
            { header: 'Duration (min)', key: 'duration', width: 12 },
            { header: 'Scheduled At', key: 'scheduledAt', width: 20 },
            { header: 'Notes', key: 'notes', width: 30 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Calls');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="calls-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.callsService.findOne(companyId, id);
    }
    update(companyId, id, updateCallDto) {
        return this.callsService.update(companyId, id, updateCallDto);
    }
    logCall(companyId, id, body) {
        return this.callsService.logCall(companyId, id, body.outcome, body.notes, body.duration);
    }
    remove(companyId, id) {
        return this.callsService.remove(companyId, id);
    }
};
exports.CompanyCallsController = CompanyCallsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateCallDto]),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryCallsDto]),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('directions'),
    (0, permissions_guard_1.RequireView)('crm', 'calls'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "getDirections", null);
__decorate([
    (0, common_1.Get)('outcomes'),
    (0, permissions_guard_1.RequireView)('crm', 'calls'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "getOutcomes", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_guard_1.RequireView)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('upcoming'),
    (0, permissions_guard_1.RequireView)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('allUsers')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "getUpcomingCalls", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryCallsDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyCallsController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateCallDto]),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/log'),
    (0, permissions_guard_1.RequireEdit)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "logCall", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('crm', 'calls'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyCallsController.prototype, "remove", null);
exports.CompanyCallsController = CompanyCallsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/calls'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [calls_service_1.CallsService,
        export_service_1.ExportService])
], CompanyCallsController);
//# sourceMappingURL=company-calls.controller.js.map