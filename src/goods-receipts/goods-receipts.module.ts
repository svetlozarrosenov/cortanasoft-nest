import { Module, forwardRef } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { CompanyGoodsReceiptsController } from './company-goods-receipts.controller';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';

@Module({
  imports: [forwardRef(() => PurchaseOrdersModule)],
  controllers: [GoodsReceiptsController, CompanyGoodsReceiptsController],
  providers: [GoodsReceiptsService],
  exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
