import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { SprintsService } from './sprints.service';
import { CompanyTicketsController } from './company-tickets.controller';
import { CompanySprintsController } from './company-sprints.controller';
import { TicketRemindersCronService } from './ticket-reminders.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyTicketsController, CompanySprintsController],
  providers: [TicketsService, SprintsService, TicketRemindersCronService],
  exports: [TicketsService, SprintsService],
})
export class TicketsModule {}
