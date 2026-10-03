import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerCategoriesService } from './customer-categories.service';
import { CompanyCustomerCategoriesController } from './company-customer-categories.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyCustomerCategoriesController],
  providers: [CustomerCategoriesService],
  exports: [CustomerCategoriesService],
})
export class CustomerCategoriesModule {}
