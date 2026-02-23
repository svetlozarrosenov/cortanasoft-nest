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
exports.CompanyLeadsController = void 0;
const common_1 = require("@nestjs/common");
const leads_service_1 = require("./leads.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const export_service_1 = require("../common/export/export.service");
let CompanyLeadsController = class CompanyLeadsController {
    leadsService;
    exportService;
    constructor(leadsService, exportService) {
        this.leadsService = leadsService;
        this.exportService = exportService;
    }
    create(companyId, dto, req) {
        return this.leadsService.create(companyId, dto, req.user?.id);
    }
    findAll(companyId, query) {
        return this.leadsService.findAll(companyId, query);
    }
    getStatuses() {
        return this.leadsService.getStatuses();
    }
    getSources() {
        return this.leadsService.getSources();
    }
    async export(companyId, query, format = 'xlsx', res) {
        const result = await this.leadsService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const data = result.items;
        const columns = [
            { header: 'First Name', key: 'firstName', width: 20 },
            { header: 'Last Name', key: 'lastName', width: 20 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Company', key: 'companyName', width: 25 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Source', key: 'source', width: 15 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Leads');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.leadsService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.leadsService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.leadsService.remove(companyId, id);
    }
    convertToCustomer(companyId, id) {
        return this.leadsService.convertToCustomer(companyId, id);
    }
    convertToCrmCompany(companyId, id) {
        return this.leadsService.convertToCrmCompany(companyId, id);
    }
};
exports.CompanyLeadsController = CompanyLeadsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('crm', 'leads'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateLeadDto, Object]),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('crm', 'leads'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryLeadsDto]),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('statuses'),
    (0, permissions_guard_1.RequireView)('crm', 'leads'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "getStatuses", null);
__decorate([
    (0, common_1.Get)('sources'),
    (0, permissions_guard_1.RequireView)('crm', 'leads'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "getSources", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('crm', 'leads'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryLeadsDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyLeadsController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('crm', 'leads'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('crm', 'leads'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateLeadDto]),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('crm', 'leads'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-customer'),
    (0, permissions_guard_1.RequireEdit)('crm', 'leads'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "convertToCustomer", null);
__decorate([
    (0, common_1.Post)(':id/convert-to-crm-company'),
    (0, permissions_guard_1.RequireEdit)('crm', 'leads'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyLeadsController.prototype, "convertToCrmCompany", null);
exports.CompanyLeadsController = CompanyLeadsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/leads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [leads_service_1.LeadsService,
        export_service_1.ExportService])
], CompanyLeadsController);
//# sourceMappingURL=company-leads.controller.js.map