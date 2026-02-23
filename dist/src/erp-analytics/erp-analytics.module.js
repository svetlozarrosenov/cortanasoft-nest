"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpAnalyticsModule = void 0;
const common_1 = require("@nestjs/common");
const erp_analytics_service_1 = require("./erp-analytics.service");
const erp_analytics_controller_1 = require("./erp-analytics.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const expenses_module_1 = require("../expenses/expenses.module");
let ErpAnalyticsModule = class ErpAnalyticsModule {
};
exports.ErpAnalyticsModule = ErpAnalyticsModule;
exports.ErpAnalyticsModule = ErpAnalyticsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, expenses_module_1.ExpensesModule],
        controllers: [erp_analytics_controller_1.ErpAnalyticsController],
        providers: [erp_analytics_service_1.ErpAnalyticsService],
        exports: [erp_analytics_service_1.ErpAnalyticsService],
    })
], ErpAnalyticsModule);
//# sourceMappingURL=erp-analytics.module.js.map