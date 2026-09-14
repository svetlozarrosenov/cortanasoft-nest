import { Module } from '@nestjs/common';
import { CompanyLookupService } from './company-lookup.service';
import { CompanyLookupController } from './company-lookup.controller';

@Module({
  controllers: [CompanyLookupController],
  providers: [CompanyLookupService],
  exports: [CompanyLookupService],
})
export class CompanyLookupModule {}
