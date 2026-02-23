import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { CompanyDealsController } from './company-deals.controller';

@Module({
  controllers: [CompanyDealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
