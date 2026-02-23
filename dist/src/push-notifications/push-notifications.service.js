"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PushNotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const admin = __importStar(require("firebase-admin"));
const prisma_service_1 = require("../prisma/prisma.service");
let PushNotificationsService = PushNotificationsService_1 = class PushNotificationsService {
    prisma;
    configService;
    logger = new common_1.Logger(PushNotificationsService_1.name);
    isConfigured = false;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    onModuleInit() {
        this.initializeFirebase();
    }
    initializeFirebase() {
        const projectId = this.configService.get('FIREBASE_PROJECT_ID');
        const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');
        const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');
        if (!projectId || !clientEmail || !privateKey) {
            this.logger.warn('Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env');
            return;
        }
        try {
            if (admin.apps.length === 0) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey: privateKey.replace(/\\n/g, '\n'),
                    }),
                });
            }
            this.isConfigured = true;
            this.logger.log('Firebase Admin SDK initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Firebase Admin SDK', error);
        }
    }
    isEnabled() {
        return this.isConfigured;
    }
    async subscribe(userId, data) {
        const existing = await this.prisma.pushSubscription.findUnique({
            where: { fcmToken: data.fcmToken },
        });
        if (existing) {
            return this.prisma.pushSubscription.update({
                where: { id: existing.id },
                data: {
                    userId,
                    userAgent: data.userAgent,
                    deviceName: data.deviceName,
                    platform: data.platform,
                    isActive: true,
                    updatedAt: new Date(),
                },
            });
        }
        return this.prisma.pushSubscription.create({
            data: {
                fcmToken: data.fcmToken,
                userId,
                userAgent: data.userAgent,
                deviceName: data.deviceName,
                platform: data.platform,
            },
        });
    }
    async unsubscribe(fcmToken) {
        const subscription = await this.prisma.pushSubscription.findUnique({
            where: { fcmToken },
        });
        if (subscription) {
            await this.prisma.pushSubscription.update({
                where: { id: subscription.id },
                data: { isActive: false },
            });
        }
        return { success: true };
    }
    async getUserSubscriptions(userId) {
        return this.prisma.pushSubscription.findMany({
            where: { userId, isActive: true },
        });
    }
    async sendToUser(userId, payload) {
        if (!this.isConfigured) {
            this.logger.warn('Firebase not configured');
            return { success: 0, failed: 0 };
        }
        const subscriptions = await this.prisma.pushSubscription.findMany({
            where: { userId, isActive: true },
        });
        return this.sendToTokens(subscriptions.map((s) => s.fcmToken), payload);
    }
    async sendToUsers(userIds, payload) {
        if (!this.isConfigured) {
            this.logger.warn('Firebase not configured');
            return { success: 0, failed: 0 };
        }
        const subscriptions = await this.prisma.pushSubscription.findMany({
            where: {
                userId: { in: userIds },
                isActive: true,
            },
        });
        return this.sendToTokens(subscriptions.map((s) => s.fcmToken), payload);
    }
    async sendToCompany(companyId, payload) {
        if (!this.isConfigured) {
            this.logger.warn('Firebase not configured');
            return { success: 0, failed: 0 };
        }
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { pushNotificationsEnabled: true },
        });
        if (!company?.pushNotificationsEnabled) {
            this.logger.debug(`Push notifications disabled for company ${companyId}`);
            return { success: 0, failed: 0 };
        }
        const userCompanies = await this.prisma.userCompany.findMany({
            where: { companyId },
            select: { userId: true },
        });
        const userIds = userCompanies.map((uc) => uc.userId);
        const subscriptions = await this.prisma.pushSubscription.findMany({
            where: {
                userId: { in: userIds },
                isActive: true,
            },
        });
        return this.sendToTokens(subscriptions.map((s) => s.fcmToken), payload);
    }
    async isCompanyEnabled(companyId) {
        const company = await this.prisma.company.findUnique({
            where: { id: companyId },
            select: { pushNotificationsEnabled: true },
        });
        return company?.pushNotificationsEnabled ?? false;
    }
    async sendToTokens(tokens, payload) {
        if (tokens.length === 0) {
            return { success: 0, failed: 0 };
        }
        const message = {
            tokens,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            webpush: {
                notification: {
                    icon: payload.icon || '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png',
                    tag: payload.tag,
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: payload.url || '/',
                },
            },
            data: {
                url: payload.url || '/',
                ...payload.data,
            },
        };
        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(tokens[idx]);
                        this.logger.debug(`Failed to send to token: ${resp.error?.message}`);
                    }
                });
                if (failedTokens.length > 0) {
                    await this.prisma.pushSubscription.updateMany({
                        where: { fcmToken: { in: failedTokens } },
                        data: { isActive: false },
                    });
                }
            }
            const successfulTokens = tokens.filter((_, idx) => response.responses[idx].success);
            if (successfulTokens.length > 0) {
                await this.prisma.pushSubscription.updateMany({
                    where: { fcmToken: { in: successfulTokens } },
                    data: { lastUsedAt: new Date() },
                });
            }
            this.logger.debug(`Sent ${response.successCount} notifications, ${response.failureCount} failed`);
            return {
                success: response.successCount,
                failed: response.failureCount,
            };
        }
        catch (error) {
            this.logger.error('Failed to send FCM notifications', error);
            return { success: 0, failed: tokens.length };
        }
    }
    async cleanupOldSubscriptions() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        const result = await this.prisma.pushSubscription.deleteMany({
            where: {
                isActive: false,
                updatedAt: { lt: cutoffDate },
            },
        });
        this.logger.log(`Cleaned up ${result.count} old subscriptions`);
        return result.count;
    }
};
exports.PushNotificationsService = PushNotificationsService;
exports.PushNotificationsService = PushNotificationsService = PushNotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PushNotificationsService);
//# sourceMappingURL=push-notifications.service.js.map