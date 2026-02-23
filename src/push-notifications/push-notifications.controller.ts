import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Req,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PushNotificationsService,
  SubscriptionData,
} from './push-notifications.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

class SubscribeDto {
  fcmToken: string;
  userAgent?: string;
  deviceName?: string;
  platform?: string; // 'web', 'android', 'ios'
}

class UnsubscribeDto {
  fcmToken: string;
}

@Controller('push')
export class PushNotificationsController {
  constructor(private pushService: PushNotificationsService) {}

  /**
   * Check if push notifications are enabled (Firebase configured)
   */
  @Get('status')
  getStatus() {
    return {
      enabled: this.pushService.isEnabled(),
    };
  }

  /**
   * Subscribe to push notifications with FCM token
   */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async subscribe(@Req() req: AuthenticatedRequest, @Body() dto: SubscribeDto) {
    const subscriptionData: SubscriptionData = {
      fcmToken: dto.fcmToken,
      userAgent: dto.userAgent,
      deviceName: dto.deviceName,
      platform: dto.platform,
    };

    const subscription = await this.pushService.subscribe(
      req.user.userId,
      subscriptionData,
    );

    return {
      success: true,
      subscriptionId: subscription.id,
    };
  }

  /**
   * Unsubscribe from push notifications
   */
  @Delete('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    await this.pushService.unsubscribe(dto.fcmToken);
    return { success: true };
  }

  /**
   * Get user's active subscriptions
   */
  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  async getSubscriptions(@Req() req: AuthenticatedRequest) {
    const subscriptions = await this.pushService.getUserSubscriptions(
      req.user.userId,
    );

    return subscriptions.map((sub) => ({
      id: sub.id,
      deviceName: sub.deviceName,
      platform: sub.platform,
      userAgent: sub.userAgent,
      createdAt: sub.createdAt,
      lastUsedAt: sub.lastUsedAt,
    }));
  }

  /**
   * Check if push notifications are enabled for a company
   */
  @Get('company/:companyId/enabled')
  @UseGuards(JwtAuthGuard)
  async isCompanyEnabled(@Param('companyId') companyId: string) {
    const enabled = await this.pushService.isCompanyEnabled(companyId);
    return { enabled };
  }
}
