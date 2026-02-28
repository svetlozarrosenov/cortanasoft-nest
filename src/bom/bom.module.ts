import { Module } from '@nestjs/common';
import { CompanyBOMController } from './company-bom.controller';
import { BOMService } from './bom.service';

@Module({
  controllers: [CompanyBOMController],
  providers: [BOMService],
  exports: [BOMService],
})
export class BOMModule {}
