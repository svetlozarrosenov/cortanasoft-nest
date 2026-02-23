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
exports.ErpAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const erp_analytics_service_1 = require("./erp-analytics.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let ErpAnalyticsController = class ErpAnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getProfitAnalytics(companyId, query) {
        return this.analyticsService.getProfitAnalytics(companyId, query);
    }
    async getPurchaseSummary(companyId, query) {
        return this.analyticsService.getPurchaseSummary(companyId, query);
    }
    async getFinancialSummary(companyId, query) {
        return this.analyticsService.getFinancialSummary(companyId, query);
    }
};
exports.ErpAnalyticsController = ErpAnalyticsController;
__decorate([
    (0, common_1.Get)('profit'),
    (0, permissions_guard_1.RequireView)('erp', 'analytics'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryProfitAnalyticsDto]),
    __metadata("design:returntype", Promise)
], ErpAnalyticsController.prototype, "getProfitAnalytics", null);
__decorate([
    (0, common_1.Get)('purchases'),
    (0, permissions_guard_1.RequireView)('erp', 'analytics'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryProfitAnalyticsDto]),
    __metadata("design:returntype", Promise)
], ErpAnalyticsController.prototype, "getPurchaseSummary", null);
__decorate([
    (0, common_1.Get)('financial-summary'),
    (0, permissions_guard_1.RequireView)('erp', 'analytics'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryProfitAnalyticsDto]),
    __metadata("design:returntype", Promise)
], ErpAnalyticsController.prototype, "getFinancialSummary", null);
exports.ErpAnalyticsController = ErpAnalyticsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/erp-analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [erp_analytics_service_1.ErpAnalyticsService])
], ErpAnalyticsController);
//# sourceMappingURL=erp-analytics.controller.js.map