import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CompanyCustomersController } from './company-customers.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyCustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
