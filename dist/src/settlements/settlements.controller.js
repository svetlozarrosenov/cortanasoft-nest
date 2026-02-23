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
exports.SettlementsController = void 0;
const common_1 = require("@nestjs/common");
const settlements_service_1 = require("./settlements.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const client_1 = require("@prisma/client");
let SettlementsController = class SettlementsController {
    settlementsService;
    constructor(settlementsService) {
        this.settlementsService = settlementsService;
    }
    async findAll(countryId, region, municipality, type, search, isActive, limit) {
        return this.settlementsService.findAll({
            countryId,
            region,
            municipality,
            type,
            search,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    async getRegions(countryId) {
        return this.settlementsService.getRegions(countryId);
    }
    async getMunicipalities(countryId, region) {
        return this.settlementsService.getMunicipalities(countryId, region);
    }
    async findOne(id) {
        return this.settlementsService.findOne(id);
    }
};
exports.SettlementsController = SettlementsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('countryId')),
    __param(1, (0, common_1.Query)('region')),
    __param(2, (0, common_1.Query)('municipality')),
    __param(3, (0, common_1.Query)('type')),
    __param(4, (0, common_1.Query)('search')),
    __param(5, (0, common_1.Query)('isActive')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('regions/:countryId'),
    __param(0, (0, common_1.Param)('countryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "getRegions", null);
__decorate([
    (0, common_1.Get)('municipalities/:countryId'),
    __param(0, (0, common_1.Param)('countryId')),
    __param(1, (0, common_1.Query)('region')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "getMunicipalities", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettlementsController.prototype, "findOne", null);
exports.SettlementsController = SettlementsController = __decorate([
    (0, common_1.Controller)('settlements'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [settlements_service_1.SettlementsService])
], SettlementsController);
//# sourceMappingURL=settlements.controller.js.map