import { Module } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { CompanyGoodsReceiptsController } from './company-goods-receipts.controller';

@Module({
  controllers: [GoodsReceiptsController, CompanyGoodsReceiptsController],
  providers: [GoodsReceiptsService],
  exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
