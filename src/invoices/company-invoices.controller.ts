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
import { InvoicesService } from './invoices.service';
import {
  CreateInvoiceDto,
  CreateProformaDto,
  UpdateInvoiceDto,
  QueryInvoicesDto,
  RecordPaymentDto,
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

@Controller('companies/:companyId/invoices')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyInvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('erp', 'invoices')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.createFromOrder(companyId, user.id, dto);
  }

  @Post('proforma')
  @RequireCreate('erp', 'invoices')
  createProforma(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProformaDto,
  ) {
    return this.invoicesService.createProforma(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'invoices')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryInvoicesDto,
  ) {
    return this.invoicesService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('erp', 'invoices')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryInvoicesDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.invoicesService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'Invoice Number', key: 'invoiceNumber', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Issue Date', key: 'invoiceDate', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'VAT Amount', key: 'vatAmount', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Paid Amount', key: 'paidAmount', width: 15 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Invoices');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('by-order/:orderId')
  @RequireView('erp', 'invoices')
  findByOrder(
    @Param('companyId') companyId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.invoicesService.findByOrder(companyId, orderId);
  }

  @Get(':id')
  @RequireView('erp', 'invoices')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'invoices')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(companyId, id, dto);
  }

  @Post(':id/issue')
  @RequireEdit('erp', 'invoices')
  issue(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.invoicesService.issue(companyId, id);
  }

  @Post(':id/payment')
  @RequireEdit('erp', 'invoices')
  recordPayment(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.invoicesService.recordPayment(companyId, id, dto);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'invoices')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.invoicesService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'invoices')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.invoicesService.remove(companyId, id);
  }
}
