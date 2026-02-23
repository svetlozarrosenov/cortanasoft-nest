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
  Request,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto, QueryDealsDto } from './dto';
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
import { DealStatus } from '@prisma/client';

@Controller('companies/:companyId/deals')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyDealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly exportService: ExportService,
  ) {}

  @Post()
  @RequireCreate('crm', 'deals')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateDealDto,
    @Request() req: any,
  ) {
    return this.dealsService.create(companyId, dto, req.user?.id);
  }

  @Get()
  @RequireView('crm', 'deals')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryDealsDto,
  ) {
    return this.dealsService.findAll(companyId, query);
  }

  @Get('statuses')
  @RequireView('crm', 'deals')
  getStatuses() {
    return this.dealsService.getStatuses();
  }

  @Get('statistics')
  @RequireView('crm', 'deals')
  getStatistics(@Param('companyId') companyId: string) {
    return this.dealsService.getStatistics(companyId);
  }

  @Get('export')
  @RequireView('crm', 'deals')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryDealsDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.dealsService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const data = (result as any).data || (result as any).items || [];
    const columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Probability %', key: 'probability', width: 12 },
      { header: 'Expected Close', key: 'expectedCloseDate', width: 15 },
      { header: 'Customer', key: 'customer.companyName', width: 25 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Deals');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="deals-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('crm', 'deals')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.dealsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('crm', 'deals')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.dealsService.update(companyId, id, dto);
  }

  @Patch(':id/status')
  @RequireEdit('crm', 'deals')
  updateStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { status: DealStatus; lostReason?: string },
  ) {
    return this.dealsService.updateStatus(
      companyId,
      id,
      body.status,
      body.lostReason,
    );
  }

  @Delete(':id')
  @RequireDelete('crm', 'deals')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.dealsService.remove(companyId, id);
  }
}
