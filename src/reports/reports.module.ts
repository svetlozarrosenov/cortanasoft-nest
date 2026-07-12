import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CompanyReportsController } from './company-reports.controller';

@Module({
  controllers: [CompanyReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
