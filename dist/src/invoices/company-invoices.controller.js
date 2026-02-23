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
exports.CompanyInvoicesController = void 0;
const common_1 = require("@nestjs/common");
const invoices_service_1 = require("./invoices.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const export_service_1 = require("../common/export/export.service");
let CompanyInvoicesController = class CompanyInvoicesController {
    invoicesService;
    exportService;
    constructor(invoicesService, exportService) {
        this.invoicesService = invoicesService;
        this.exportService = exportService;
    }
    create(companyId, user, dto) {
        return this.invoicesService.createFromOrder(companyId, user.id, dto);
    }
    createProforma(companyId, user, dto) {
        return this.invoicesService.createProforma(companyId, user.id, dto);
    }
    findAll(companyId, query) {
        return this.invoicesService.findAll(companyId, query);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.invoicesService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'Invoice Number', key: 'invoiceNumber', width: 15 },
            { header: 'Type', key: 'type', width: 12 },
            { header: 'Issue Date', key: 'invoiceDate', width: 15 },
            { header: 'Due Date', key: 'dueDate', width: 15 },
            { header: 'Customer Name', key: 'customerName', width: 25 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Subtotal', key: 'subtotal', width: 15 },
            { header: 'VAT Amount', key: 'vatAmount', width: 15 },
            { header: 'Total', key: 'total', width: 15 },
            { header: 'Paid Amount', key: 'paidAmount', width: 15 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Invoices');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findByOrder(companyId, orderId) {
        return this.invoicesService.findByOrder(companyId, orderId);
    }
    findOne(companyId, id) {
        return this.invoicesService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.invoicesService.update(companyId, id, dto);
    }
    issue(companyId, id) {
        return this.invoicesService.issue(companyId, id);
    }
    recordPayment(companyId, id, dto) {
        return this.invoicesService.recordPayment(companyId, id, dto);
    }
    cancel(companyId, id) {
        return this.invoicesService.cancel(companyId, id);
    }
    remove(companyId, id) {
        return this.invoicesService.remove(companyId, id);
    }
};
exports.CompanyInvoicesController = CompanyInvoicesController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateInvoiceDto]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('proforma'),
    (0, permissions_guard_1.RequireCreate)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateProformaDto]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "createProforma", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryInvoicesDto]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryInvoicesDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyInvoicesController.prototype, "export", null);
__decorate([
    (0, common_1.Get)('by-order/:orderId'),
    (0, permissions_guard_1.RequireView)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('orderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "findByOrder", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateInvoiceDto]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/issue'),
    (0, permissions_guard_1.RequireEdit)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "issue", null);
__decorate([
    (0, common_1.Post)(':id/payment'),
    (0, permissions_guard_1.RequireEdit)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.RecordPaymentDto]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "recordPayment", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_guard_1.RequireEdit)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('erp', 'invoices'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyInvoicesController.prototype, "remove", null);
exports.CompanyInvoicesController = CompanyInvoicesController = __decorate([
    (0, common_1.Controller)('companies/:companyId/invoices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [invoices_service_1.InvoicesService,
        export_service_1.ExportService])
], CompanyInvoicesController);
//# sourceMappingURL=company-invoices.controller.js.map