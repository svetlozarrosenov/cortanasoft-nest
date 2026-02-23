import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CompanyAttendanceController } from './company-attendance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyAttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
