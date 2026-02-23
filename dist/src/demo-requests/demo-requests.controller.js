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
exports.DemoRequestsController = void 0;
const common_1 = require("@nestjs/common");
const demo_requests_service_1 = require("./demo-requests.service");
const dto_1 = require("./dto");
let DemoRequestsController = class DemoRequestsController {
    demoRequestsService;
    constructor(demoRequestsService) {
        this.demoRequestsService = demoRequestsService;
    }
    async create(dto) {
        const demoRequest = await this.demoRequestsService.create(dto);
        return {
            success: true,
            message: 'Заявката е изпратена успешно. Ще се свържем с вас скоро!',
            demoRequest: {
                id: demoRequest.id,
                name: demoRequest.name,
                email: demoRequest.email,
            },
        };
    }
};
exports.DemoRequestsController = DemoRequestsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateDemoRequestDto]),
    __metadata("design:returntype", Promise)
], DemoRequestsController.prototype, "create", null);
exports.DemoRequestsController = DemoRequestsController = __decorate([
    (0, common_1.Controller)('demo-requests'),
    __metadata("design:paramtypes", [demo_requests_service_1.DemoRequestsService])
], DemoRequestsController);
//# sourceMappingURL=demo-requests.controller.js.map