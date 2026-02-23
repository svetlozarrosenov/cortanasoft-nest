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
exports.CompanyGoodsReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const goods_receipts_service_1 = require("./goods-receipts.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let CompanyGoodsReceiptsController = class CompanyGoodsReceiptsController {
    goodsReceiptsService;
    constructor(goodsReceiptsService) {
        this.goodsReceiptsService = goodsReceiptsService;
    }
    create(companyId, user, dto) {
        return this.goodsReceiptsService.create(companyId, user.id, dto);
    }
    findAll(companyId, query) {
        return this.goodsReceiptsService.findAll(companyId, query);
    }
    findOne(companyId, id) {
        return this.goodsReceiptsService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.goodsReceiptsService.update(companyId, id, dto);
    }
    confirm(companyId, id) {
        console.log(`[Controller] Confirm called: companyId=${companyId}, id=${id}`);
        return this.goodsReceiptsService.confirm(companyId, id);
    }
    cancel(companyId, id) {
        return this.goodsReceiptsService.cancel(companyId, id);
    }
    remove(companyId, id) {
        return this.goodsReceiptsService.remove(companyId, id);
    }
};
exports.CompanyGoodsReceiptsController = CompanyGoodsReceiptsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('erp', 'goodsReceipts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.CreateGoodsReceiptDto]),
    __metadata("design:returntype", void 0)
], CompanyGoodsReceiptsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('erp', 'goodsReceipts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryGoodsReceiptsDto]),
    __metadata("design:returntype", void 0)
], CompanyGoodsReceiptsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('erp', 'goodsReceipts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyGoodsReceiptsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('erp', 'goodsReceipts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateGoodsReceiptDto]),
    __metadata("design:returntype", void 0)
], CompanyGoodsReceiptsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    (0, permissions_guard_1.RequireEdit)('erp', 'goodsReceipts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyGoodsReceiptsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_guard_1.RequireEdit)('erp', 'goodsReceipts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyGoodsReceiptsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('erp', 'goodsReceipts'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyGoodsReceiptsController.prototype, "remove", null);
exports.CompanyGoodsReceiptsController = CompanyGoodsReceiptsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/goods-receipts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [goods_receipts_service_1.GoodsReceiptsService])
], CompanyGoodsReceiptsController);
//# sourceMappingURL=company-goods-receipts.controller.js.map