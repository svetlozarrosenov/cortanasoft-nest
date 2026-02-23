import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CompanyPurchaseOrdersController } from './company-purchase-orders.controller';

@Module({
  controllers: [CompanyPurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
