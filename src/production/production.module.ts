import { Module } from '@nestjs/common';
import { CompanyProductionController } from './company-production.controller';
import { ProductionService } from './production.service';

@Module({
  controllers: [CompanyProductionController],
  providers: [ProductionService],
  exports: [ProductionService],
})
export class ProductionModule {}
