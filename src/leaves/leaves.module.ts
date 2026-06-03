import { Module } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { CompanyLeavesController } from './company-leaves.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';

@Module({
  imports: [PrismaModule, UploadsModule, PushNotificationsModule],
  controllers: [CompanyLeavesController],
  providers: [LeavesService],
  exports: [LeavesService],
})
export class LeavesModule {}
