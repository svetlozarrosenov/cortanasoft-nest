import { Module } from '@nestjs/common';
import { ContactSubmissionsService } from './contact-submissions.service';
import { ContactSubmissionsController } from './contact-submissions.controller';
import { AdminContactSubmissionsController } from './admin-contact-submissions.controller';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PushNotificationsModule, MailModule],
  controllers: [ContactSubmissionsController, AdminContactSubmissionsController],
  providers: [ContactSubmissionsService],
  exports: [ContactSubmissionsService],
})
export class ContactSubmissionsModule {}
