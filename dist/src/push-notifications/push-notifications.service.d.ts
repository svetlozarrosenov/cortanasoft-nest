import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export interface SubscriptionData {
    fcmToken: string;
    userAgent?: string;
    deviceName?: string;
    platform?: string;
}
export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    tag?: string;
    data?: Record<string, string>;
}
export declare class PushNotificationsService implements OnModuleInit {
    private prisma;
    private configService;
    private readonly logger;
    private isConfigured;
    constructor(prisma: PrismaService, configService: ConfigService);
    onModuleInit(): void;
    private initializeFirebase;
    isEnabled(): boolean;
    subscribe(userId: string, data: SubscriptionData): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fcmToken: string;
        userAgent: string | null;
        deviceName: string | null;
        platform: string | null;
        lastUsedAt: Date | null;
    }>;
    unsubscribe(fcmToken: string): Promise<{
        success: boolean;
    }>;
    getUserSubscriptions(userId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fcmToken: string;
        userAgent: string | null;
        deviceName: string | null;
        platform: string | null;
        lastUsedAt: Date | null;
    }[]>;
    sendToUser(userId: string, payload: PushPayload): Promise<{
        success: number;
        failed: number;
    }>;
    sendToUsers(userIds: string[], payload: PushPayload): Promise<{
        success: number;
        failed: number;
    }>;
    sendToCompany(companyId: string, payload: PushPayload): Promise<{
        success: number;
        failed: number;
    }>;
    isCompanyEnabled(companyId: string): Promise<boolean>;
    private sendToTokens;
    cleanupOldSubscriptions(): Promise<number>;
}
