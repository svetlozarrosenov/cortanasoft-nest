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
exports.PushNotificationsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const push_notifications_service_1 = require("./push-notifications.service");
class SubscribeDto {
    fcmToken;
    userAgent;
    deviceName;
    platform;
}
class UnsubscribeDto {
    fcmToken;
}
let PushNotificationsController = class PushNotificationsController {
    pushService;
    constructor(pushService) {
        this.pushService = pushService;
    }
    getStatus() {
        return {
            enabled: this.pushService.isEnabled(),
        };
    }
    async subscribe(req, dto) {
        const subscriptionData = {
            fcmToken: dto.fcmToken,
            userAgent: dto.userAgent,
            deviceName: dto.deviceName,
            platform: dto.platform,
        };
        const subscription = await this.pushService.subscribe(req.user.userId, subscriptionData);
        return {
            success: true,
            subscriptionId: subscription.id,
        };
    }
    async unsubscribe(dto) {
        await this.pushService.unsubscribe(dto.fcmToken);
        return { success: true };
    }
    async getSubscriptions(req) {
        const subscriptions = await this.pushService.getUserSubscriptions(req.user.userId);
        return subscriptions.map((sub) => ({
            id: sub.id,
            deviceName: sub.deviceName,
            platform: sub.platform,
            userAgent: sub.userAgent,
            createdAt: sub.createdAt,
            lastUsedAt: sub.lastUsedAt,
        }));
    }
    async isCompanyEnabled(companyId) {
        const enabled = await this.pushService.isCompanyEnabled(companyId);
        return { enabled };
    }
};
exports.PushNotificationsController = PushNotificationsController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PushNotificationsController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SubscribeDto]),
    __metadata("design:returntype", Promise)
], PushNotificationsController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Delete)('unsubscribe'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UnsubscribeDto]),
    __metadata("design:returntype", Promise)
], PushNotificationsController.prototype, "unsubscribe", null);
__decorate([
    (0, common_1.Get)('subscriptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PushNotificationsController.prototype, "getSubscriptions", null);
__decorate([
    (0, common_1.Get)('company/:companyId/enabled'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PushNotificationsController.prototype, "isCompanyEnabled", null);
exports.PushNotificationsController = PushNotificationsController = __decorate([
    (0, common_1.Controller)('push'),
    __metadata("design:paramtypes", [push_notifications_service_1.PushNotificationsService])
], PushNotificationsController);
//# sourceMappingURL=push-notifications.controller.js.map