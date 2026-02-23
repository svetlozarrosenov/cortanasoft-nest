import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CompanyContactsController } from './company-contacts.controller';

@Module({
  controllers: [CompanyContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
