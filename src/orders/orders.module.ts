import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CompanyOrdersController } from './company-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WarrantiesModule } from '../warranties/warranties.module';

@Module({
  imports: [PrismaModule, WarrantiesModule],
  controllers: [CompanyOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
