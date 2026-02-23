import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CompanyTicketsController } from './company-tickets.controller';
import { TicketRemindersCronService } from './ticket-reminders.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyTicketsController],
  providers: [TicketsService, TicketRemindersCronService],
  exports: [TicketsService],
})
export class TicketsModule {}
