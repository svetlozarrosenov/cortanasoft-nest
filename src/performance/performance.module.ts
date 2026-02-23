import { Module } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { CompanyPerformanceController } from './company-performance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyPerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
