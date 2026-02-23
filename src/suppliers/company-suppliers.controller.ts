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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySuppliersDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
} from '../common/guards/permissions.guard';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';

@Controller('companies/:companyId/suppliers')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanySuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('erp', 'suppliers')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(companyId, dto);
  }

  @Get()
  @RequireView('erp', 'suppliers')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QuerySuppliersDto,
  ) {
    return this.suppliersService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('erp', 'suppliers')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QuerySuppliersDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.suppliersService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'EIK', key: 'eik', width: 15 },
      { header: 'VAT Number', key: 'vatNumber', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Contact Person', key: 'contactPerson', width: 25 },
      { header: 'Active', key: 'isActive', width: 10 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Suppliers');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="suppliers-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('erp', 'suppliers')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.suppliersService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'suppliers')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('erp', 'suppliers')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.suppliersService.remove(companyId, id);
  }
}
