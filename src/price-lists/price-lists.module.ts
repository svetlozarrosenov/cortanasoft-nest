import { Module } from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { CompanyPriceListsController } from './company-price-lists.controller';

@Module({
  controllers: [CompanyPriceListsController],
  providers: [PriceListsService],
  exports: [PriceListsService],
})
export class PriceListsModule {}
