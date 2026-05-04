import { Module } from '@nestjs/common';
import { StockReceiptsService } from './stock-receipts.service';
import { CompanyStockReceiptsController } from './company-stock-receipts.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyStockReceiptsController],
  providers: [StockReceiptsService],
  exports: [StockReceiptsService],
})
export class StockReceiptsModule {}
