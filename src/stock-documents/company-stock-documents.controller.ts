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
import { StockDocumentsService } from './stock-documents.service';
import {
  CreateStockDocumentDto,
  UpdateStockDocumentDto,
  QueryStockDocumentsDto,
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

@Controller('companies/:companyId/stock-documents')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyStockDocumentsController {
  constructor(
    private readonly stockDocumentsService: StockDocumentsService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('erp', 'stockDocuments')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateStockDocumentDto,
  ) {
    return this.stockDocumentsService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'stockDocuments')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryStockDocumentsDto,
  ) {
    return this.stockDocumentsService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('erp', 'stockDocuments')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryStockDocumentsDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.stockDocumentsService.findAll(companyId, {
      ...query,
      page: 1,
      limit: 100000,
    } as any);
    const columns = [
      { header: 'Document Number', key: 'documentNumber', width: 20 },
      { header: 'Type', key: 'type', width: 25 },
      { header: 'Date', key: 'documentDate', width: 15 },
      { header: 'Recipient', key: 'recipientName', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'VAT', key: 'vatAmount', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
    ];
    const buffer = await this.exportService.generateFile(
      columns,
      data,
      format,
      'Stock Documents',
    );
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type':
        format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="stock-documents-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('erp', 'stockDocuments')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.stockDocumentsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'stockDocuments')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStockDocumentDto,
  ) {
    return this.stockDocumentsService.update(companyId, id, dto);
  }

  @Post(':id/issue')
  @RequireEdit('erp', 'stockDocuments')
  issue(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.stockDocumentsService.issue(companyId, id);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'stockDocuments')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.stockDocumentsService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'stockDocuments')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.stockDocumentsService.remove(companyId, id);
  }
}
