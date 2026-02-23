"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoodsReceiptsModule = void 0;
const common_1 = require("@nestjs/common");
const goods_receipts_service_1 = require("./goods-receipts.service");
const goods_receipts_controller_1 = require("./goods-receipts.controller");
const company_goods_receipts_controller_1 = require("./company-goods-receipts.controller");
const purchase_orders_module_1 = require("../purchase-orders/purchase-orders.module");
let GoodsReceiptsModule = class GoodsReceiptsModule {
};
exports.GoodsReceiptsModule = GoodsReceiptsModule;
exports.GoodsReceiptsModule = GoodsReceiptsModule = __decorate([
    (0, common_1.Module)({
        imports: [(0, common_1.forwardRef)(() => purchase_orders_module_1.PurchaseOrdersModule)],
        controllers: [goods_receipts_controller_1.GoodsReceiptsController, company_goods_receipts_controller_1.CompanyGoodsReceiptsController],
        providers: [goods_receipts_service_1.GoodsReceiptsService],
        exports: [goods_receipts_service_1.GoodsReceiptsService],
    })
], GoodsReceiptsModule);
//# sourceMappingURL=goods-receipts.module.js.map