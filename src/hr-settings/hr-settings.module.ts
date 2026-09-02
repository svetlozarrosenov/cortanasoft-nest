import { Module } from '@nestjs/common';
import { HrSettingsService } from './hr-settings.service';
import { CompanyHrSettingsController } from './company-hr-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyHrSettingsController],
  providers: [HrSettingsService],
  exports: [HrSettingsService],
})
export class HrSettingsModule {}
