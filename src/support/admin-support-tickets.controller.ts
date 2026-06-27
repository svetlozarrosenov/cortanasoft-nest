import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import {
  CreateSupportTicketMessageDto,
  UpdateSupportTicketDto,
  QuerySupportTicketsDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { checkPermission } from '../common/guards/permissions.guard';
import { ErrorMessages } from '../common/constants/error-messages';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Админ страна — само потребители от OWNER компанията (СВ Софт). `SuperAdminGuard`
 * гарантира, че текущата компания е OWNER; допълнително гейтваме по гранулярното
 * право `support.tickets` на ролята (същото меню „Поддръжка", което клиентите
 * ползват), за да виждат/отговарят/управляват само тези, чиято роля има правото.
 * Вижда ВСИЧКИ тикети от всички компании.
 */
@Controller('admin/support/tickets')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminSupportTicketsController {
  constructor(private supportTickets: SupportTicketsService) {}

  // Текущата компания е OWNER (гарантирано от SuperAdminGuard), затова проверяваме
  // правото върху currentRole на потребителя.
  private assertPermission(
    user: any,
    action: 'view' | 'create' | 'edit' | 'delete',
  ) {
    if (
      !checkPermission(user?.currentRole?.permissions, 'support', 'tickets', action)
    ) {
      throw new ForbiddenException(
        ErrorMessages.common.missingPermission(`support.tickets.${action}`),
      );
    }
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() query: QuerySupportTicketsDto,
  ) {
    this.assertPermission(user, 'view');
    const result = await this.supportTickets.findAllAdmin(query);
    return { success: true, ...result };
  }

  @Get('stats')
  async getStats(@CurrentUser() user: any) {
    this.assertPermission(user, 'view');
    const stats = await this.supportTickets.getStats();
    return { success: true, stats };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    this.assertPermission(user, 'view');
    const ticket = await this.supportTickets.findOneAdmin(id);
    return { success: true, ticket };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    this.assertPermission(user, 'edit');
    const ticket = await this.supportTickets.updateAdmin(id, dto);
    return { success: true, ticket };
  }

  @Post(':id/messages')
  async addMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateSupportTicketMessageDto,
  ) {
    this.assertPermission(user, 'create');
    const message = await this.supportTickets.addSupportMessage(
      user.id,
      id,
      dto,
    );
    return { success: true, message };
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    this.assertPermission(user, 'delete');
    await this.supportTickets.removeAdmin(id);
    return { success: true };
  }
}
