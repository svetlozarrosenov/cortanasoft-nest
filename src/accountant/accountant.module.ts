import { Module } from '@nestjs/common';
import { AccountantService } from './accountant.service';
import { CompanyAccountantController } from './company-accountant.controller';

@Module({
  controllers: [CompanyAccountantController],
  providers: [AccountantService],
  exports: [AccountantService],
})
export class AccountantModule {}
