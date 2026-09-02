import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CompanyPayrollController } from './company-payroll.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HrSettingsModule } from '../hr-settings/hr-settings.module';

@Module({
  imports: [PrismaModule, HrSettingsModule],
  controllers: [CompanyPayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
