import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
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
    @CurrentUser() user: any,
    @Query() query: QuerySupportTicketsDto,
  ) {
    const result = await this.supportTickets.findAllForCompany(
      companyId,
      user.id,
      query,
    );
    return { success: true, ...result };
  }

  /** Бадж в менюто: тикети с непрочетен отговор от СВ Софт (преди ':id') */
  @Get('unread-count')
  @RequireView('support', 'tickets')
  async unreadCount(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
  ) {
    const count = await this.supportTickets.countUnreadForCompany(
      companyId,
      user.id,
    );
    return { success: true, count };
  }

  @Get(':id')
  @RequireView('support', 'tickets')
  async findOne(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const ticket = await this.supportTickets.findOneForCompany(
      companyId,
      user.id,
      id,
    );
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

  // ---------- прикачени файлове ----------

  @Post(':id/attachments')
  @RequireCreate('support', 'tickets')
  @UseInterceptors(FileInterceptor('file'))
  async addAttachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('messageId') messageId?: string,
  ) {
    if (!file) throw new BadRequestException('Липсва файл');
    const attachment = await this.supportTickets.addAttachment(
      id,
      file,
      messageId || undefined,
      companyId,
    );
    return { success: true, attachment };
  }

  /** Проксира файла от R2 през бекенда (private bucket). */
  @Get(':id/attachments/:attachmentId/file')
  @RequireView('support', 'tickets')
  async getAttachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, contentType, fileName } =
      await this.supportTickets.getAttachmentStream(
        id,
        attachmentId,
        companyId,
      );
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    return new StreamableFile(stream);
  }
}
