import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { WorkShiftsService } from './work-shifts.service';
import { CompanyWorkShiftsController } from './company-work-shifts.controller';
import { AutoAttendanceCronService } from './auto-attendance.cron';

@Module({
  imports: [PrismaModule, AttendanceModule],
  controllers: [CompanyWorkShiftsController],
  providers: [WorkShiftsService, AutoAttendanceCronService],
})
export class WorkShiftsModule {}
