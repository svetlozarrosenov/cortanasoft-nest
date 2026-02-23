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
exports.GoodsReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const goods_receipts_service_1 = require("./goods-receipts.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let GoodsReceiptsController = class GoodsReceiptsController {
    goodsReceiptsService;
    constructor(goodsReceiptsService) {
        this.goodsReceiptsService = goodsReceiptsService;
    }
    create(user, dto) {
        return this.goodsReceiptsService.create(user.currentCompany.id, user.id, dto);
    }
    findAll(user, query) {
        return this.goodsReceiptsService.findAll(user.currentCompany.id, query);
    }
    findOne(user, id) {
        return this.goodsReceiptsService.findOne(user.currentCompany.id, id);
    }
    update(user, id, dto) {
        return this.goodsReceiptsService.update(user.currentCompany.id, id, dto);
    }
    confirm(user, id) {
        return this.goodsReceiptsService.confirm(user.currentCompany.id, id);
    }
    cancel(user, id) {
        return this.goodsReceiptsService.cancel(user.currentCompany.id, id);
    }
    remove(user, id) {
        return this.goodsReceiptsService.remove(user.currentCompany.id, id);
    }
};
exports.GoodsReceiptsController = GoodsReceiptsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateGoodsReceiptDto]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.QueryGoodsReceiptsDto]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateGoodsReceiptDto]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/confirm'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "confirm", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], GoodsReceiptsController.prototype, "remove", null);
exports.GoodsReceiptsController = GoodsReceiptsController = __decorate([
    (0, common_1.Controller)('goods-receipts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [goods_receipts_service_1.GoodsReceiptsService])
], GoodsReceiptsController);
//# sourceMappingURL=goods-receipts.controller.js.map