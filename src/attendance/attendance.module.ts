import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CompanyAttendanceController } from './company-attendance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HrSettingsModule } from '../hr-settings/hr-settings.module';

@Module({
  imports: [PrismaModule, HrSettingsModule],
  controllers: [CompanyAttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
