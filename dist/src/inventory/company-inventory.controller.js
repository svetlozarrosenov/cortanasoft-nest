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
exports.CompanyInventoryController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const inventory_service_1 = require("./inventory.service");
const dto_1 = require("./dto");
const export_service_1 = require("../common/export/export.service");
let CompanyInventoryController = class CompanyInventoryController {
    inventoryService;
    exportService;
    constructor(inventoryService, exportService) {
        this.inventoryService = inventoryService;
        this.exportService = exportService;
    }
    findAll(companyId, query) {
        return this.inventoryService.findAll(companyId, query);
    }
    getStockLevels(companyId, query) {
        return this.inventoryService.getStockLevels(companyId, query);
    }
    getByLocation(companyId, locationId, query) {
        return this.inventoryService.getByLocation(companyId, locationId, query);
    }
    getByProduct(companyId, productId, query) {
        return this.inventoryService.getByProduct(companyId, productId, query);
    }
    getByGoodsReceipt(companyId, goodsReceiptId) {
        return this.inventoryService.getByGoodsReceipt(companyId, goodsReceiptId);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.inventoryService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'Product', key: 'product.name', width: 25 },
            { header: 'SKU', key: 'product.sku', width: 15 },
            { header: 'Location', key: 'location.name', width: 20 },
            { header: 'Quantity', key: 'quantity', width: 12 },
            { header: 'Batch Number', key: 'batchNumber', width: 15 },
            { header: 'Expiry Date', key: 'expiryDate', width: 15 },
            { header: 'Unit Cost', key: 'unitCost', width: 15 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Inventory');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="inventory-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findOne(companyId, id) {
        return this.inventoryService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.inventoryService.update(companyId, id, dto);
    }
};
exports.CompanyInventoryController = CompanyInventoryController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('erp', 'inventory'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryInventoryDto]),
    __metadata("design:returntype", void 0)
], CompanyInventoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stock-levels'),
    (0, permissions_guard_1.RequireView)('erp', 'inventory'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryStockLevelsDto]),
    __metadata("design:returntype", void 0)
], CompanyInventoryController.prototype, "getStockLevels", null);
__decorate([
    (0, common_1.Get)('by-location/:locationId'),
    (0, permissions_guard_1.RequireView)('erp', 'inventory'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.QueryInventoryDto]),
    __metadata("design:returntype", void 0)
], CompanyInventoryController.prototype, "getByLocation", null);
__decorate([
    (0, common_1.Get)('by-product/:productId'),
    (0, permissions_guard_1.RequireView)('erp', 'inventory'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.QueryInventoryDto]),
    __metadata("design:returntype", void 0)
], CompanyInventoryController.prototype, "getByProduct", null);
__decorate([
    (0, common_1.Get)('by-receipt/:goodsReceiptId'),
    (0, permissions_guard_1.RequireView)('erp', 'inventory'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('goodsReceiptId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyInventoryController.prototype, "getByGoodsReceipt", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('erp', 'inventory'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryInventoryDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyInventoryController.prototype, "export", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('erp', 'inventory'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyInventoryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('erp', 'inventory'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateInventoryBatchDto]),
    __metadata("design:returntype", void 0)
], CompanyInventoryController.prototype, "update", null);
exports.CompanyInventoryController = CompanyInventoryController = __decorate([
    (0, common_1.Controller)('companies/:companyId/inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService,
        export_service_1.ExportService])
], CompanyInventoryController);
//# sourceMappingURL=company-inventory.controller.js.map