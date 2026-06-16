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
import { ProformasService } from './proformas.service';
import {
  CreateProformaDto,
  UpdateProformaDto,
  QueryProformasDto,
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

// Проформите ползват същата permission единица като фактурите ('erp','invoices'),
// за да не въвеждаме нов permission — UI-ят ги управлява от един екран.
@Controller('companies/:companyId/proformas')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyProformasController {
  constructor(
    private readonly proformasService: ProformasService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('erp', 'invoices')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProformaDto,
  ) {
    return this.proformasService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('erp', 'invoices')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryProformasDto,
  ) {
    return this.proformasService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('erp', 'invoices')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryProformasDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.proformasService.findAll(companyId, {
      ...query,
      page: 1,
      limit: 100000,
    } as any);
    const columns = [
      { header: 'Proforma Number', key: 'proformaNumber', width: 18 },
      { header: 'Issue Date', key: 'proformaDate', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'VAT Amount', key: 'vatAmount', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
    ];
    const buffer = await this.exportService.generateFile(
      columns,
      data,
      format,
      'Proformas',
    );
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type':
        format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="proformas-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('erp', 'invoices')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.proformasService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'invoices')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProformaDto,
  ) {
    return this.proformasService.update(companyId, id, dto);
  }

  @Post(':id/cancel')
  @RequireEdit('erp', 'invoices')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.proformasService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('erp', 'invoices')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.proformasService.remove(companyId, id);
  }
}
