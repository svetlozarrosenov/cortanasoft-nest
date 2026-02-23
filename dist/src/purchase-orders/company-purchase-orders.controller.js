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
exports.CompanyPurchaseOrdersController = void 0;
const common_1 = require("@nestjs/common");
const purchase_orders_service_1 = require("./purchase-orders.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const export_service_1 = require("../common/export/export.service");
let CompanyPurchaseOrdersController = class CompanyPurchaseOrdersController {
    purchaseOrdersService;
    exportService;
    constructor(purchaseOrdersService, exportService) {
        this.purchaseOrdersService = purchaseOrdersService;
        this.exportService = exportService;
    }
    create(companyId, user, dto) {
        return this.purchaseOrdersService.create(companyId, user.id, dto);
    }
    findAll(companyId, query) {
        return this.purchaseOrdersService.findAll(companyId, query);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.purchaseOrdersService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'Order Number', key: 'orderNumber', width: 15 },
            { header: 'Supplier', key: 'supplier.name', width: 25 },
            { header: 'Order Date', key: 'orderDate', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Total Amount', key: 'totalAmount', width: 15 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'PurchaseOrders');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="purchase-orders-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.purchaseOrdersService.findOne(companyId, id);
    }
    getPendingItems(companyId, id) {
        return this.purchaseOrdersService.getPendingItems(companyId, id);
    }
    update(companyId, id, dto) {
        return this.purchaseOrdersService.update(companyId, id, dto);
    }
    send(companyId, id) {
        return this.purchaseOrdersService.send(companyId, id);
    }
    confirm(companyId, id) {
        return this.purchaseOrdersService.confirm(companyId, id);
    }
    cancel(companyId, id) {
        return this.purchaseOrdersService.cancel(companyId, id);
    }
    remove(companyId, id) {
        return this.purchaseOrdersService.remove(companyId, id);
    }
};
exports.CompanyPurchaseOrdersController = CompanyPurchaseOrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreatePurchaseOrderDto]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryPurchaseOrdersDto]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryPurchaseOrdersDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyPurchaseOrdersController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/pending-items'),
    (0, permissions_guard_1.RequireView)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "getPendingItems", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdatePurchaseOrderDto]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/send'),
    (0, permissions_guard_1.RequireEdit)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "send", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    (0, permissions_guard_1.RequireEdit)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_guard_1.RequireEdit)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('erp', 'purchaseOrders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPurchaseOrdersController.prototype, "remove", null);
exports.CompanyPurchaseOrdersController = CompanyPurchaseOrdersController = __decorate([
    (0, common_1.Controller)('companies/:companyId/purchase-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [purchase_orders_service_1.PurchaseOrdersService,
        export_service_1.ExportService])
], CompanyPurchaseOrdersController);
//# sourceMappingURL=company-purchase-orders.controller.js.map