import { Module } from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { CompanySupportTicketsController } from './company-support-tickets.controller';
import { AdminSupportTicketsController } from './admin-support-tickets.controller';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';

@Module({
  imports: [PushNotificationsModule],
  controllers: [
    CompanySupportTicketsController,
    AdminSupportTicketsController,
  ],
  providers: [SupportTicketsService],
  exports: [SupportTicketsService],
})
export class SupportModule {}
