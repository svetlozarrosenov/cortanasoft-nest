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
import { WarrantiesService } from './warranties.service';
import {
  CreateWarrantyTemplateDto,
  UpdateWarrantyTemplateDto,
  QueryWarrantyTemplatesDto,
  QueryIssuedWarrantiesDto,
  UpdateIssuedWarrantyDto,
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

@Controller('companies/:companyId/warranties')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class WarrantiesController {
  constructor(
    private readonly warrantiesService: WarrantiesService,
    private readonly exportService: ExportService,
  ) {}

  // ==================== Templates ====================

  @Post('templates')
  @RequireCreate('warranties', 'templates')
  createTemplate(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateWarrantyTemplateDto,
  ) {
    return this.warrantiesService.createTemplate(companyId, user.id, dto);
  }

  @Get('templates')
  @RequireView('warranties', 'templates')
  findAllTemplates(
    @Param('companyId') companyId: string,
    @Query() query: QueryWarrantyTemplatesDto,
  ) {
    return this.warrantiesService.findAllTemplates(companyId, query);
  }

  @Get('templates/:id')
  @RequireView('warranties', 'templates')
  findOneTemplate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.warrantiesService.findOneTemplate(companyId, id);
  }

  @Patch('templates/:id')
  @RequireEdit('warranties', 'templates')
  updateTemplate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWarrantyTemplateDto,
  ) {
    return this.warrantiesService.updateTemplate(companyId, id, dto);
  }

  @Delete('templates/:id')
  @RequireDelete('warranties', 'templates')
  removeTemplate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.warrantiesService.removeTemplate(companyId, id);
  }

  // ==================== Issued Warranties ====================

  @Get('issued')
  @RequireView('warranties', 'issued')
  findAllIssued(
    @Param('companyId') companyId: string,
    @Query() query: QueryIssuedWarrantiesDto,
  ) {
    return this.warrantiesService.findAllIssued(companyId, query);
  }

  @Get('issued/export')
  @RequireView('warranties', 'issued')
  async exportIssued(
    @Param('companyId') companyId: string,
    @Query() query: QueryIssuedWarrantiesDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.warrantiesService.findAllIssued(companyId, {
      ...query,
      page: 1,
      limit: 100000,
    } as any);
    const columns = [
      { header: 'Номер', key: 'warrantyNumber', width: 20 },
      { header: 'Продукт', key: 'productName', width: 25 },
      { header: 'Клиент', key: 'customerName', width: 25 },
      { header: 'Начало', key: 'startDate', width: 15 },
      { header: 'Край', key: 'endDate', width: 15 },
      { header: 'Статус', key: 'status', width: 12 },
      { header: 'Сериен номер', key: 'serialNumber', width: 20 },
    ];
    const rows = data.map((w: any) => ({
      warrantyNumber: w.warrantyNumber,
      productName: w.product?.name || '',
      customerName: w.customer?.companyName || `${w.customer?.firstName || ''} ${w.customer?.lastName || ''}`.trim(),
      startDate: new Date(w.startDate).toLocaleDateString('bg-BG'),
      endDate: new Date(w.endDate).toLocaleDateString('bg-BG'),
      status: w.status,
      serialNumber: w.serialNumber || '',
    }));
    const buffer = await this.exportService.generateFile(columns, rows, format, 'Warranties');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="warranties-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('issued/:id')
  @RequireView('warranties', 'issued')
  findOneIssued(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.warrantiesService.findOneIssued(companyId, id);
  }

  @Patch('issued/:id')
  @RequireEdit('warranties', 'issued')
  updateIssued(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIssuedWarrantyDto,
  ) {
    return this.warrantiesService.updateIssued(companyId, id, dto);
  }
}
