import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  QueryTicketDto,
  CreateCommentDto,
  CreateReminderDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/tickets')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ==================== Tickets CRUD ====================

  @Post()
  @RequireCreate('tickets', 'allTickets')
  create(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(companyId, req.user.id, dto);
  }

  @Get()
  @RequireView('tickets', 'allTickets')
  findAll(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Query() query: QueryTicketDto,
  ) {
    return this.ticketsService.findAll(companyId, req.user.id, query);
  }

  @Get('summary')
  @RequireView('tickets', 'allTickets')
  getSummary(@Param('companyId') companyId: string, @Request() req: any) {
    return this.ticketsService.getSummary(companyId, req.user.id);
  }

  @Get(':id')
  @RequireView('tickets', 'allTickets')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.ticketsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('tickets', 'allTickets')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('tickets', 'allTickets')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.ticketsService.remove(companyId, id);
  }

  // ==================== Status Transitions ====================

  @Post(':id/start')
  @RequireEdit('tickets', 'allTickets')
  startProgress(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.ticketsService.startProgress(companyId, id);
  }

  @Post(':id/submit-review')
  @RequireEdit('tickets', 'allTickets')
  submitForReview(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.ticketsService.submitForReview(companyId, id);
  }

  @Post(':id/complete')
  @RequireEdit('tickets', 'allTickets')
  complete(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.ticketsService.complete(companyId, id);
  }

  @Post(':id/cancel')
  @RequireEdit('tickets', 'allTickets')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.ticketsService.cancel(companyId, id);
  }

  @Post(':id/assign-to-me')
  @RequireEdit('tickets', 'allTickets')
  assignToMe(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.ticketsService.assignToMe(companyId, id, req.user.id);
  }

  // ==================== Comments ====================

  @Post(':id/comments')
  @RequireEdit('tickets', 'allTickets')
  addComment(
    @Param('companyId') companyId: string,
    @Param('id') ticketId: string,
    @Request() req: any,
    @Body() dto: CreateCommentDto,
  ) {
    return this.ticketsService.addComment(
      companyId,
      ticketId,
      req.user.id,
      dto,
    );
  }

  @Get(':id/comments')
  @RequireView('tickets', 'allTickets')
  getComments(
    @Param('companyId') companyId: string,
    @Param('id') ticketId: string,
  ) {
    return this.ticketsService.getComments(companyId, ticketId);
  }

  @Delete(':id/comments/:commentId')
  @RequireDelete('tickets', 'allTickets')
  deleteComment(
    @Param('companyId') companyId: string,
    @Param('id') ticketId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.ticketsService.deleteComment(companyId, ticketId, commentId);
  }

  // ==================== Reminders ====================

  @Post(':id/reminders')
  @RequireEdit('tickets', 'allTickets')
  addReminder(
    @Param('companyId') companyId: string,
    @Param('id') ticketId: string,
    @Request() req: any,
    @Body() dto: CreateReminderDto,
  ) {
    return this.ticketsService.addReminder(
      companyId,
      ticketId,
      req.user.id,
      dto,
    );
  }

  @Get(':id/reminders')
  @RequireView('tickets', 'allTickets')
  getReminders(
    @Param('companyId') companyId: string,
    @Param('id') ticketId: string,
  ) {
    return this.ticketsService.getReminders(companyId, ticketId);
  }

  @Delete(':id/reminders/:reminderId')
  @RequireDelete('tickets', 'allTickets')
  deleteReminder(
    @Param('companyId') companyId: string,
    @Param('id') ticketId: string,
    @Param('reminderId') reminderId: string,
  ) {
    return this.ticketsService.deleteReminder(companyId, ticketId, reminderId);
  }
}
