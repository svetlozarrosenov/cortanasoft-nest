import { Module } from '@nestjs/common';
import { CreditApplicationsService } from './credit-applications.service';
import { CreditApplicationsController } from './credit-applications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [CreditApplicationsController],
  providers: [CreditApplicationsService],
  exports: [CreditApplicationsService],
})
export class CreditApplicationsModule {}
