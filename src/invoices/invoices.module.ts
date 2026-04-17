import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CompanyInvoicesController } from './company-invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [CompanyInvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
