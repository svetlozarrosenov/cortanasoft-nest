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
exports.CompanyDealsController = void 0;
const common_1 = require("@nestjs/common");
const deals_service_1 = require("./deals.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const export_service_1 = require("../common/export/export.service");
let CompanyDealsController = class CompanyDealsController {
    dealsService;
    exportService;
    constructor(dealsService, exportService) {
        this.dealsService = dealsService;
        this.exportService = exportService;
    }
    create(companyId, dto, req) {
        return this.dealsService.create(companyId, dto, req.user?.id);
    }
    findAll(companyId, query) {
        return this.dealsService.findAll(companyId, query);
    }
    getStatuses() {
        return this.dealsService.getStatuses();
    }
    getStatistics(companyId) {
        return this.dealsService.getStatistics(companyId);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const result = await this.dealsService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const data = result.data || result.items || [];
        const columns = [
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Probability %', key: 'probability', width: 12 },
            { header: 'Expected Close', key: 'expectedCloseDate', width: 15 },
            { header: 'Customer', key: 'customer.companyName', width: 25 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Deals');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="deals-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.dealsService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.dealsService.update(companyId, id, dto);
    }
    updateStatus(companyId, id, body) {
        return this.dealsService.updateStatus(companyId, id, body.status, body.lostReason);
    }
    remove(companyId, id) {
        return this.dealsService.remove(companyId, id);
    }
};
exports.CompanyDealsController = CompanyDealsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('crm', 'deals'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateDealDto, Object]),
    __metadata("design:returntype", void 0)
], CompanyDealsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('crm', 'deals'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryDealsDto]),
    __metadata("design:returntype", void 0)
], CompanyDealsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('statuses'),
    (0, permissions_guard_1.RequireView)('crm', 'deals'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyDealsController.prototype, "getStatuses", null);
__decorate([
    (0, common_1.Get)('statistics'),
    (0, permissions_guard_1.RequireView)('crm', 'deals'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyDealsController.prototype, "getStatistics", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('crm', 'deals'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryDealsDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyDealsController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('crm', 'deals'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyDealsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('crm', 'deals'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateDealDto]),
    __metadata("design:returntype", void 0)
], CompanyDealsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, permissions_guard_1.RequireEdit)('crm', 'deals'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CompanyDealsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('crm', 'deals'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyDealsController.prototype, "remove", null);
exports.CompanyDealsController = CompanyDealsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/deals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [deals_service_1.DealsService,
        export_service_1.ExportService])
], CompanyDealsController);
//# sourceMappingURL=company-deals.controller.js.map