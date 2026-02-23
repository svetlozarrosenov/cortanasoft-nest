import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
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
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';

@Controller('companies/:companyId/expenses')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly exportService: ExportService,
  ) {}

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
