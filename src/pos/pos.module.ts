import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { FiscalDevicesModule } from '../fiscal-devices/fiscal-devices.module';
import { PosService } from './pos.service';
import { PosEventsService } from './pos-events.service';
import { CompanyPosController } from './company-pos.controller';
import { FiscalAgentJobsController } from './fiscal-agent-jobs.controller';
import { OrderReceiptController } from './order-receipt.controller';

@Module({
  imports: [PrismaModule, OrdersModule, FiscalDevicesModule],
  controllers: [
    CompanyPosController,
    FiscalAgentJobsController,
    OrderReceiptController,
  ],
  providers: [PosService, PosEventsService],
})
export class PosModule {}
