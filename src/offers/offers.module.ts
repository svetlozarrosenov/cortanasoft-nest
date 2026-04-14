import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { CompanyOffersController } from './company-offers.controller';

@Module({
  controllers: [CompanyOffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
