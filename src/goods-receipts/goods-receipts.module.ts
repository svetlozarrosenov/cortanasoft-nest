import { Module } from '@nestjs/common';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { CompanyGoodsReceiptsController } from './company-goods-receipts.controller';
import { WordPressModule } from '../wordpress/wordpress.module';
import { CloudCartModule } from '../cloudcart/cloudcart.module';

@Module({
  imports: [WordPressModule, CloudCartModule],
  controllers: [GoodsReceiptsController, CompanyGoodsReceiptsController],
  providers: [GoodsReceiptsService],
  exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
