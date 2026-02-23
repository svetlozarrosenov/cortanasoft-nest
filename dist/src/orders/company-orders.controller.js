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
exports.CompanyOrdersController = void 0;
const common_1 = require("@nestjs/common");
const orders_service_1 = require("./orders.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const export_service_1 = require("../common/export/export.service");
let CompanyOrdersController = class CompanyOrdersController {
    ordersService;
    exportService;
    constructor(ordersService, exportService) {
        this.ordersService = ordersService;
        this.exportService = exportService;
    }
    create(companyId, user, dto) {
        return this.ordersService.create(companyId, user.id, dto);
    }
    findAll(companyId, query) {
        return this.ordersService.findAll(companyId, query);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.ordersService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'Order Number', key: 'orderNumber', width: 15 },
            { header: 'Order Date', key: 'orderDate', width: 15 },
            { header: 'Customer Name', key: 'customerName', width: 25 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Payment Status', key: 'paymentStatus', width: 15 },
            { header: 'Subtotal', key: 'subtotal', width: 15 },
            { header: 'VAT Amount', key: 'vatAmount', width: 15 },
            { header: 'Total', key: 'total', width: 15 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Orders');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.ordersService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.ordersService.update(companyId, id, dto);
    }
    confirm(companyId, id) {
        return this.ordersService.confirm(companyId, id);
    }
    cancel(companyId, id) {
        return this.ordersService.cancel(companyId, id);
    }
    remove(companyId, id) {
        return this.ordersService.remove(companyId, id);
    }
};
exports.CompanyOrdersController = CompanyOrdersController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('erp', 'orders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateOrderDto]),
    __metadata("design:returntype", void 0)
], CompanyOrdersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('erp', 'orders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryOrdersDto]),
    __metadata("design:returntype", void 0)
], CompanyOrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('erp', 'orders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryOrdersDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyOrdersController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('erp', 'orders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyOrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('erp', 'orders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateOrderDto]),
    __metadata("design:returntype", void 0)
], CompanyOrdersController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    (0, permissions_guard_1.RequireEdit)('erp', 'orders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyOrdersController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_guard_1.RequireEdit)('erp', 'orders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyOrdersController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('erp', 'orders'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyOrdersController.prototype, "remove", null);
exports.CompanyOrdersController = CompanyOrdersController = __decorate([
    (0, common_1.Controller)('companies/:companyId/orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [orders_service_1.OrdersService,
        export_service_1.ExportService])
], CompanyOrdersController);
//# sourceMappingURL=company-orders.controller.js.map