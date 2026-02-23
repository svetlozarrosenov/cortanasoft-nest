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
exports.CountriesController = void 0;
const common_1 = require("@nestjs/common");
const countries_service_1 = require("./countries.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
let CountriesController = class CountriesController {
    countriesService;
    constructor(countriesService) {
        this.countriesService = countriesService;
    }
    async findAll(isActive, isEU) {
        const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
        const eu = isEU === 'true' ? true : isEU === 'false' ? false : undefined;
        return this.countriesService.findAll(active, eu);
    }
};
exports.CountriesController = CountriesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('isActive')),
    __param(1, (0, common_1.Query)('isEU')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CountriesController.prototype, "findAll", null);
exports.CountriesController = CountriesController = __decorate([
    (0, common_1.Controller)('countries'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [countries_service_1.CountriesService])
], CountriesController);
//# sourceMappingURL=countries.controller.js.map