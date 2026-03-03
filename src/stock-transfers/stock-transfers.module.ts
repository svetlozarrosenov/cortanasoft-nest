import { Module } from '@nestjs/common';
import { StockTransfersService } from './stock-transfers.service';
import { CompanyStockTransfersController } from './company-stock-transfers.controller';

@Module({
  controllers: [CompanyStockTransfersController],
  providers: [StockTransfersService],
  exports: [StockTransfersService],
})
export class StockTransfersModule {}
