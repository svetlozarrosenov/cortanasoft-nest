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
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const uploads_service_1 = require("./uploads.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let UploadsController = class UploadsController {
    uploadsService;
    constructor(uploadsService) {
        this.uploadsService = uploadsService;
    }
    async uploadInvoice(companyId, file) {
        if (!file) {
            throw new common_1.BadRequestException('Не е предоставен файл');
        }
        return this.uploadsService.uploadInvoice(companyId, file);
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)('invoice'),
    (0, permissions_guard_1.RequireCreate)('erp', 'goodsReceipts'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadInvoice", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/uploads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [uploads_service_1.UploadsService])
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map