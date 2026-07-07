import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  StreamableFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ExpensesService } from './expenses.service';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  QueryExpensesDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';
import { UploadsService } from '../uploads/uploads.service';

@Controller('companies/:companyId/expenses')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly exportService: ExportService,
    private readonly uploads: UploadsService,
  ) {}

  // Качване на фактурата/бележката на разход (attachmentUrl пази R2 ключа).
  // Отделен от uploads/invoice, който изисква warehouse.goodsReceipts права.
  @Post('upload-attachment')
  @RequireAnyPermission(
    { module: 'erp', page: 'expenses', action: 'create' },
    { module: 'erp', page: 'expenses', action: 'edit' },
  )
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('companyId') companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Не е предоставен файл');
    }
    return this.uploads.uploadInvoice(companyId, file);
  }

  @Post()
  @RequireCreate('erp', 'expenses')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'expenses')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryExpensesDto,
  ) {
    return this.expensesService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('erp', 'expenses')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryExpensesDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.expensesService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'VAT Amount', key: 'vatAmount', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Expense Date', key: 'expenseDate', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Expenses');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('erp', 'expenses')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.expensesService.findOne(companyId, id);
  }

  // Стриймва прикачения файл на разхода (частен R2 ключ → през backend-а).
  @Get(':id/attachment')
  @RequireView('erp', 'expenses')
  async attachment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const expense = await this.expensesService.findOne(companyId, id);
    if (!expense.attachmentUrl) {
      throw new NotFoundException('Разходът няма прикачен файл');
    }
    // Легаси записи (Cortana scanner) може да пазят пълен URL вместо ключ.
    if (/^https?:\/\//i.test(expense.attachmentUrl)) {
      return res.redirect(expense.attachmentUrl);
    }
    const { stream, contentType, contentLength } = await this.uploads.getFile(
      expense.attachmentUrl,
    );
    res.set({
      'Content-Type': contentType,
      ...(contentLength ? { 'Content-Length': String(contentLength) } : {}),
    });
    stream.pipe(res);
  }

  @Patch(':id')
  @RequireEdit('erp', 'expenses')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(companyId, id, dto);
  }

  @Post(':id/approve')
  @RequireEdit('erp', 'expenses')
  approve(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.expensesService.approve(companyId, id, user.id);
  }

  @Post(':id/mark-paid')
  @RequireEdit('erp', 'expenses')
  markAsPaid(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.expensesService.markAsPaid(companyId, id);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'expenses')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.expensesService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'expenses')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.expensesService.remove(companyId, id);
  }
}
