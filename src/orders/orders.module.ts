import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CompanyOrdersController } from './company-orders.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
