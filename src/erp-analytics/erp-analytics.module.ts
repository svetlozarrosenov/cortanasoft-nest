import { Module } from '@nestjs/common';
import { ErpAnalyticsService } from './erp-analytics.service';
import { ErpAnalyticsController } from './erp-analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpensesModule } from '../expenses/expenses.module';

@Module({
  imports: [PrismaModule, ExpensesModule],
  controllers: [ErpAnalyticsController],
  providers: [ErpAnalyticsService],
  exports: [ErpAnalyticsService],
})
export class ErpAnalyticsModule {}
