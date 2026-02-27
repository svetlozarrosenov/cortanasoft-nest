import { Module } from '@nestjs/common';
import { StockDocumentsService } from './stock-documents.service';
import { CompanyStockDocumentsController } from './company-stock-documents.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyStockDocumentsController],
  providers: [StockDocumentsService],
  exports: [StockDocumentsService],
})
export class StockDocumentsModule {}
