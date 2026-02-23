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
exports.CompanyProductsController = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("./products.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const export_service_1 = require("../common/export/export.service");
let CompanyProductsController = class CompanyProductsController {
    productsService;
    exportService;
    constructor(productsService, exportService) {
        this.productsService = productsService;
        this.exportService = exportService;
    }
    create(companyId, user, dto) {
        return this.productsService.create(companyId, user.id, dto);
    }
    findAll(companyId, query) {
        return this.productsService.findAll(companyId, query);
    }
    async export(companyId, query, format = 'xlsx', res) {
        const { data } = await this.productsService.findAll(companyId, { ...query, page: 1, limit: 100000 });
        const columns = [
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Type', key: 'type', width: 12 },
            { header: 'Category', key: 'category.name', width: 20 },
            { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
            { header: 'Sale Price', key: 'salePrice', width: 15 },
            { header: 'VAT Rate %', key: 'vatRate', width: 10 },
            { header: 'Unit', key: 'unit', width: 10 },
            { header: 'Active', key: 'isActive', width: 10 },
        ];
        const buffer = await this.exportService.generateFile(columns, data, format, 'Products');
        const ext = format === 'csv' ? 'csv' : 'xlsx';
        res.set({
            'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.${ext}"`,
        });
        return new common_1.StreamableFile(buffer);
    }
    findAllCategories(companyId) {
        return this.productsService.findAllCategories(companyId);
    }
    createCategory(companyId, data) {
        return this.productsService.createCategory(companyId, data);
    }
    updateCategory(companyId, id, data) {
        return this.productsService.updateCategory(companyId, id, data);
    }
    removeCategory(companyId, id) {
        return this.productsService.removeCategory(companyId, id);
    }
    findOne(companyId, id) {
        return this.productsService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.productsService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.productsService.remove(companyId, id);
    }
};
exports.CompanyProductsController = CompanyProductsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateProductDto]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryProductsDto]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, permissions_guard_1.RequireView)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryProductsDto, String, Object]),
    __metadata("design:returntype", Promise)
], CompanyProductsController.prototype, "export", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, permissions_guard_1.RequireView)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "findAllCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, permissions_guard_1.RequireCreate)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    (0, permissions_guard_1.RequireEdit)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    (0, permissions_guard_1.RequireDelete)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "removeCategory", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateProductDto]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('erp', 'products'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyProductsController.prototype, "remove", null);
exports.CompanyProductsController = CompanyProductsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/products'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        export_service_1.ExportService])
], CompanyProductsController);
//# sourceMappingURL=company-products.controller.js.map