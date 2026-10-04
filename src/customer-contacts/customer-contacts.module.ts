import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomerContactsService } from './customer-contacts.service';
import { CompanyCustomerContactsController } from './company-customer-contacts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyCustomerContactsController],
  providers: [CustomerContactsService],
})
export class CustomerContactsModule {}
