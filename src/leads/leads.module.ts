import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CompanyLeadsController } from './company-leads.controller';

@Module({
  controllers: [CompanyLeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
