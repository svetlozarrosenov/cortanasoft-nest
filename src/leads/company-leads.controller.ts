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
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, QueryLeadsDto } from './dto';
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

@Controller('companies/:companyId/leads')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyLeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('crm', 'contacts')
  create(@Param('companyId') companyId: string, @Body() dto: CreateLeadDto) {
    return this.leadsService.create(companyId, dto);
  }

  @Get()
  @RequireView('crm', 'contacts')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryLeadsDto,
  ) {
    return this.leadsService.findAll(companyId, query);
  }

  @Get('export')
  @RequireView('crm', 'contacts')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryLeadsDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.leadsService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);

    const columns = [
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Company', key: 'customer.companyName', width: 25 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Leads');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('by-customer/:customerId')
  @RequireView('crm', 'contacts')
  findByCustomer(
    @Param('companyId') companyId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.leadsService.findByCustomer(companyId, customerId);
  }

  @Get(':id')
  @RequireView('crm', 'contacts')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.leadsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('crm', 'contacts')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('crm', 'contacts')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.leadsService.remove(companyId, id);
  }

  @Post(':id/set-primary')
  @RequireEdit('crm', 'contacts')
  setAsPrimary(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.leadsService.setAsPrimary(companyId, id);
  }
}
