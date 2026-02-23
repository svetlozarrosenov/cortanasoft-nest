import { PushNotificationsService } from './push-notifications.service';
interface AuthenticatedRequest {
    user: {
        userId: string;
    };
}
declare class SubscribeDto {
    fcmToken: string;
    userAgent?: string;
    deviceName?: string;
    platform?: string;
}
declare class UnsubscribeDto {
    fcmToken: string;
}
export declare class PushNotificationsController {
    private pushService;
    constructor(pushService: PushNotificationsService);
    getStatus(): {
        enabled: boolean;
    };
    subscribe(req: AuthenticatedRequest, dto: SubscribeDto): Promise<{
        success: boolean;
        subscriptionId: string;
    }>;
    unsubscribe(dto: UnsubscribeDto): Promise<{
        success: boolean;
    }>;
    getSubscriptions(req: AuthenticatedRequest): Promise<{
        id: string;
        deviceName: string | null;
        platform: string | null;
        userAgent: string | null;
        createdAt: Date;
        lastUsedAt: Date | null;
    }[]>;
    isCompanyEnabled(companyId: string): Promise<{
        enabled: boolean;
    }>;
}
export {};
