import { Module } from '@nestjs/common';
import { AccountantService } from './accountant.service';
import { CompanyAccountantController } from './company-accountant.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [CompanyAccountantController],
  providers: [AccountantService],
  exports: [AccountantService],
})
export class AccountantModule {}
