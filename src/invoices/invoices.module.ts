import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CompanyInvoicesController } from './company-invoices.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyInvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
