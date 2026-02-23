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
exports.AdminDemoRequestsController = void 0;
const common_1 = require("@nestjs/common");
const demo_requests_service_1 = require("./demo-requests.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const super_admin_guard_1 = require("../common/guards/super-admin.guard");
let AdminDemoRequestsController = class AdminDemoRequestsController {
    demoRequestsService;
    constructor(demoRequestsService) {
        this.demoRequestsService = demoRequestsService;
    }
    async findAll(query) {
        const result = await this.demoRequestsService.findAll(query);
        return {
            success: true,
            ...result,
        };
    }
    async getStats() {
        const stats = await this.demoRequestsService.getStats();
        return {
            success: true,
            stats,
        };
    }
    getStatuses() {
        return {
            success: true,
            statuses: this.demoRequestsService.getStatuses(),
        };
    }
    async findOne(id) {
        const demoRequest = await this.demoRequestsService.findOne(id);
        return {
            success: true,
            demoRequest,
        };
    }
    async update(id, dto) {
        const demoRequest = await this.demoRequestsService.update(id, dto);
        return {
            success: true,
            demoRequest,
        };
    }
    async remove(id) {
        await this.demoRequestsService.remove(id);
        return {
            success: true,
            message: 'Demo request deleted successfully',
        };
    }
};
exports.AdminDemoRequestsController = AdminDemoRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.QueryDemoRequestsDto]),
    __metadata("design:returntype", Promise)
], AdminDemoRequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDemoRequestsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('statuses'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminDemoRequestsController.prototype, "getStatuses", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDemoRequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateDemoRequestDto]),
    __metadata("design:returntype", Promise)
], AdminDemoRequestsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDemoRequestsController.prototype, "remove", null);
exports.AdminDemoRequestsController = AdminDemoRequestsController = __decorate([
    (0, common_1.Controller)('admin/demo-requests'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, super_admin_guard_1.SuperAdminGuard),
    __metadata("design:paramtypes", [demo_requests_service_1.DemoRequestsService])
], AdminDemoRequestsController);
//# sourceMappingURL=admin-demo-requests.controller.js.map