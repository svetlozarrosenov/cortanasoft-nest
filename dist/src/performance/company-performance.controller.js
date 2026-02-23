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
exports.CompanyPerformanceController = void 0;
const common_1 = require("@nestjs/common");
const performance_service_1 = require("./performance.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let CompanyPerformanceController = class CompanyPerformanceController {
    performanceService;
    constructor(performanceService) {
        this.performanceService = performanceService;
    }
    create(companyId, dto) {
        return this.performanceService.create(companyId, dto);
    }
    findAll(companyId, query) {
        return this.performanceService.findAll(companyId, query);
    }
    getSummary(companyId, year) {
        return this.performanceService.getSummary(companyId, year ? parseInt(year) : undefined);
    }
    findOne(companyId, id) {
        return this.performanceService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.performanceService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.performanceService.remove(companyId, id);
    }
    submitForReview(companyId, id) {
        return this.performanceService.submitForReview(companyId, id);
    }
    startReview(companyId, id) {
        return this.performanceService.startReview(companyId, id);
    }
    complete(companyId, id) {
        return this.performanceService.complete(companyId, id);
    }
    cancel(companyId, id) {
        return this.performanceService.cancel(companyId, id);
    }
};
exports.CompanyPerformanceController = CompanyPerformanceController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreatePerformanceReviewDto]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryPerformanceReviewDto]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, permissions_guard_1.RequireView)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdatePerformanceReviewDto]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/submit'),
    (0, permissions_guard_1.RequireEdit)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "submitForReview", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, permissions_guard_1.RequireEdit)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "startReview", null);
__decorate([
    (0, common_1.Post)(':id/complete'),
    (0, permissions_guard_1.RequireEdit)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "complete", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, permissions_guard_1.RequireEdit)('hr', 'performance'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyPerformanceController.prototype, "cancel", null);
exports.CompanyPerformanceController = CompanyPerformanceController = __decorate([
    (0, common_1.Controller)('companies/:companyId/performance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [performance_service_1.PerformanceService])
], CompanyPerformanceController);
//# sourceMappingURL=company-performance.controller.js.map