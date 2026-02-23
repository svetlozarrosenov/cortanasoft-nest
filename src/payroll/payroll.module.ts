import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CompanyPayrollController } from './company-payroll.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyPayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
