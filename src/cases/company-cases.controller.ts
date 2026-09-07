import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CasesService } from './cases.service';
import {
  CreateCaseDto,
  CreateCaseMessageDto,
  QueryCasesDto,
  UpdateCaseDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireDelete,
  RequireEdit,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Казуси — клиентските тикети на фирмата. Скоупнато по companyId от URL-а,
 * gated от права cases.cases.
 */
@Controller('companies/:companyId/cases')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyCasesController {
  constructor(private cases: CasesService) {}

  @Get()
  @RequireView('cases', 'cases')
  findAll(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Query() query: QueryCasesDto,
  ) {
    return this.cases.findAll(companyId, user.id, query);
  }

  @Get('summary')
  @RequireView('cases', 'cases')
  summary(@Param('companyId') companyId: string, @CurrentUser() user: any) {
    return this.cases.summary(companyId, user.id);
  }

  @Get('assignees')
  @RequireView('cases', 'cases')
  assignees(@Param('companyId') companyId: string) {
    return this.cases.assignees(companyId);
  }

  @Get(':id')
  @RequireView('cases', 'cases')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.cases.findOne(companyId, id);
  }

  @Post()
  @RequireCreate('cases', 'cases')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCaseDto,
  ) {
    return this.cases.create(companyId, user.id, dto);
  }

  @Patch(':id')
  @RequireEdit('cases', 'cases')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
  ) {
    return this.cases.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('cases', 'cases')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.cases.remove(companyId, id);
  }

  // ---------- съобщения ----------

  @Post(':id/messages')
  @RequireEdit('cases', 'cases')
  addMessage(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCaseMessageDto,
  ) {
    return this.cases.addMessage(companyId, user.id, id, dto);
  }

  // ---------- прикачени файлове ----------

  @Post(':id/attachments')
  @RequireEdit('cases', 'cases')
  @UseInterceptors(FileInterceptor('file'))
  addAttachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('messageId') messageId?: string,
  ) {
    if (!file) throw new BadRequestException('Липсва файл');
    return this.cases.addAttachment(
      companyId,
      id,
      file,
      messageId || undefined,
    );
  }

  /** Проксира файла от R2 през бекенда (private bucket). */
  @Get(':id/attachments/:attachmentId/file')
  @RequireView('cases', 'cases')
  async getAttachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { stream, contentType, fileName } =
      await this.cases.getAttachmentStream(companyId, id, attachmentId);
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete(':id/attachments/:attachmentId')
  @RequireEdit('cases', 'cases')
  removeAttachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.cases.removeAttachment(companyId, id, attachmentId);
  }
}
