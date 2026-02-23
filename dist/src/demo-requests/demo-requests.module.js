"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const demo_requests_service_1 = require("./demo-requests.service");
const demo_requests_controller_1 = require("./demo-requests.controller");
const admin_demo_requests_controller_1 = require("./admin-demo-requests.controller");
let DemoRequestsModule = class DemoRequestsModule {
};
exports.DemoRequestsModule = DemoRequestsModule;
exports.DemoRequestsModule = DemoRequestsModule = __decorate([
    (0, common_1.Module)({
        controllers: [demo_requests_controller_1.DemoRequestsController, admin_demo_requests_controller_1.AdminDemoRequestsController],
        providers: [demo_requests_service_1.DemoRequestsService],
        exports: [demo_requests_service_1.DemoRequestsService],
    })
], DemoRequestsModule);
//# sourceMappingURL=demo-requests.module.js.map