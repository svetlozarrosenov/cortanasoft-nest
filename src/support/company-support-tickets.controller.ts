import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import {
  CreateSupportTicketDto,
  CreateSupportTicketMessageDto,
  QuerySupportTicketsDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequireView, RequireCreate } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Клиентска страна — потребители на фирма-наемател подават и виждат СВОИТЕ тикети.
 * Gated от права support.tickets. Скоупнато по companyId от URL-а.
 */
@Controller('companies/:companyId/support/tickets')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanySupportTicketsController {
  constructor(private supportTickets: SupportTicketsService) {}

  @Get()
  @RequireView('support', 'tickets')
  async findAll(
    @Param('companyId') companyId: string,
    @Query() query: QuerySupportTicketsDto,
  ) {
    const result = await this.supportTickets.findAllForCompany(companyId, query);
    return { success: true, ...result };
  }

  @Get(':id')
  @RequireView('support', 'tickets')
  async findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    const ticket = await this.supportTickets.findOneForCompany(companyId, id);
    return { success: true, ticket };
  }

  @Post()
  @RequireCreate('support', 'tickets')
  async create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSupportTicketDto,
  ) {
    const ticket = await this.supportTickets.createForCompany(
      companyId,
      user.id,
      dto,
    );
    return { success: true, ticket };
  }

  @Post(':id/messages')
  @RequireCreate('support', 'tickets')
  async addMessage(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSupportTicketMessageDto,
  ) {
    const message = await this.supportTickets.addCustomerMessage(
      companyId,
      user.id,
      id,
      dto,
    );
    return { success: true, message };
  }
}
