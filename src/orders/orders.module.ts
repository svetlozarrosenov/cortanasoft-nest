import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CompanyOrdersController } from './company-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WarrantiesModule } from '../warranties/warranties.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, WarrantiesModule, PaymentsModule],
  controllers: [CompanyOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
