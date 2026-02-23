import { Module } from '@nestjs/common';
import { CompanyPlansService } from './company-plans.service';
import { CompanyPlansController } from './company-plans.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyPlansController],
  providers: [CompanyPlansService],
  exports: [CompanyPlansService],
})
export class CompanyPlansModule {}
