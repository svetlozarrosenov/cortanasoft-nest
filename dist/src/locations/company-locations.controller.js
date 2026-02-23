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
exports.CompanyLocationsController = void 0;
const common_1 = require("@nestjs/common");
const locations_service_1 = require("./locations.service");
const dto_1 = require("./dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const company_access_guard_1 = require("../common/guards/company-access.guard");
const permissions_guard_1 = require("../common/guards/permissions.guard");
let CompanyLocationsController = class CompanyLocationsController {
    locationsService;
    constructor(locationsService) {
        this.locationsService = locationsService;
    }
    create(companyId, dto) {
        return this.locationsService.create(companyId, dto);
    }
    findAll(companyId, query) {
        return this.locationsService.findAll(companyId, query);
    }
    findOne(companyId, id) {
        return this.locationsService.findOne(companyId, id);
    }
    update(companyId, id, dto) {
        return this.locationsService.update(companyId, id, dto);
    }
    remove(companyId, id) {
        return this.locationsService.remove(companyId, id);
    }
    createStorageZone(companyId, locationId, dto) {
        return this.locationsService.createStorageZone(companyId, locationId, dto);
    }
    findAllStorageZones(companyId, locationId) {
        return this.locationsService.findAllStorageZones(companyId, locationId);
    }
    findOneStorageZone(companyId, locationId, zoneId) {
        return this.locationsService.findOneStorageZone(companyId, locationId, zoneId);
    }
    updateStorageZone(companyId, locationId, zoneId, dto) {
        return this.locationsService.updateStorageZone(companyId, locationId, zoneId, dto);
    }
    removeStorageZone(companyId, locationId, zoneId) {
        return this.locationsService.removeStorageZone(companyId, locationId, zoneId);
    }
};
exports.CompanyLocationsController = CompanyLocationsController;
__decorate([
    (0, common_1.Post)(),
    (0, permissions_guard_1.RequireCreate)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateLocationDto]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_guard_1.RequireView)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.QueryLocationsDto]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, permissions_guard_1.RequireView)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_guard_1.RequireEdit)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateLocationDto]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_guard_1.RequireDelete)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':locationId/zones'),
    (0, permissions_guard_1.RequireCreate)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.CreateStorageZoneDto]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "createStorageZone", null);
__decorate([
    (0, common_1.Get)(':locationId/zones'),
    (0, permissions_guard_1.RequireView)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('locationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "findAllStorageZones", null);
__decorate([
    (0, common_1.Get)(':locationId/zones/:zoneId'),
    (0, permissions_guard_1.RequireView)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "findOneStorageZone", null);
__decorate([
    (0, common_1.Patch)(':locationId/zones/:zoneId'),
    (0, permissions_guard_1.RequireEdit)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Param)('zoneId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, dto_1.UpdateStorageZoneDto]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "updateStorageZone", null);
__decorate([
    (0, common_1.Delete)(':locationId/zones/:zoneId'),
    (0, permissions_guard_1.RequireDelete)('erp', 'locations'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('locationId')),
    __param(2, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CompanyLocationsController.prototype, "removeStorageZone", null);
exports.CompanyLocationsController = CompanyLocationsController = __decorate([
    (0, common_1.Controller)('companies/:companyId/locations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, company_access_guard_1.CompanyAccessGuard, permissions_guard_1.PermissionsGuard),
    __metadata("design:paramtypes", [locations_service_1.LocationsService])
], CompanyLocationsController);
//# sourceMappingURL=company-locations.controller.js.map