import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
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

@Injectable()
export class PushNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationsService.name);
  private isConfigured = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env',
      );
      return;
    }

    try {
      // Check if Firebase is already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            // Private key comes with escaped newlines from env
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }

      this.isConfigured = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  /**
   * Check if Firebase is configured and ready
   */
  isEnabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Subscribe a device to push notifications
   */
  async subscribe(userId: string, data: SubscriptionData) {
    // Check if this token already exists
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { fcmToken: data.fcmToken },
    });

    if (existing) {
      // Update the existing subscription
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

    // Create new subscription
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

  /**
   * Unsubscribe a device from push notifications
   */
  async unsubscribe(fcmToken: string) {
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

  /**
   * Get user's active subscriptions
   */
  async getUserSubscriptions(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userId: string,
    payload: PushPayload,
  ): Promise<{ success: number; failed: number }> {
    if (!this.isConfigured) {
      this.logger.warn('Firebase not configured');
      return { success: 0, failed: 0 };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });

    return this.sendToTokens(
      subscriptions.map((s) => s.fcmToken),
      payload,
    );
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushPayload,
  ): Promise<{ success: number; failed: number }> {
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

    return this.sendToTokens(
      subscriptions.map((s) => s.fcmToken),
      payload,
    );
  }

  /**
   * Send push notification to all users in a company
   */
  async sendToCompany(
    companyId: string,
    payload: PushPayload,
  ): Promise<{ success: number; failed: number }> {
    if (!this.isConfigured) {
      this.logger.warn('Firebase not configured');
      return { success: 0, failed: 0 };
    }

    // Check if company has push notifications enabled
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { pushNotificationsEnabled: true },
    });

    if (!company?.pushNotificationsEnabled) {
      this.logger.debug(`Push notifications disabled for company ${companyId}`);
      return { success: 0, failed: 0 };
    }

    // Get all users in the company
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

    return this.sendToTokens(
      subscriptions.map((s) => s.fcmToken),
      payload,
    );
  }

  /**
   * Check if a company has push notifications enabled
   */
  async isCompanyEnabled(companyId: string): Promise<boolean> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { pushNotificationsEnabled: true },
    });
    return company?.pushNotificationsEnabled ?? false;
  }

  /**
   * Send notifications to FCM tokens
   */
  private async sendToTokens(
    tokens: string[],
    payload: PushPayload,
  ): Promise<{ success: number; failed: number }> {
    if (tokens.length === 0) {
      return { success: 0, failed: 0 };
    }

    const message: admin.messaging.MulticastMessage = {
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

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            this.logger.debug(
              `Failed to send to token: ${resp.error?.message}`,
            );
          }
        });

        // Deactivate invalid tokens
        if (failedTokens.length > 0) {
          await this.prisma.pushSubscription.updateMany({
            where: { fcmToken: { in: failedTokens } },
            data: { isActive: false },
          });
        }
      }

      // Update lastUsedAt for successful tokens
      const successfulTokens = tokens.filter(
        (_, idx) => response.responses[idx].success,
      );
      if (successfulTokens.length > 0) {
        await this.prisma.pushSubscription.updateMany({
          where: { fcmToken: { in: successfulTokens } },
          data: { lastUsedAt: new Date() },
        });
      }

      this.logger.debug(
        `Sent ${response.successCount} notifications, ${response.failureCount} failed`,
      );

      return {
        success: response.successCount,
        failed: response.failureCount,
      };
    } catch (error) {
      this.logger.error('Failed to send FCM notifications', error);
      return { success: 0, failed: tokens.length };
    }
  }

  /**
   * Clean up old inactive subscriptions
   */
  async cleanupOldSubscriptions(): Promise<number> {
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
}
