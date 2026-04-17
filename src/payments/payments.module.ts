import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CompanyPaymentsController } from './company-payments.controller';

@Module({
  controllers: [CompanyPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
