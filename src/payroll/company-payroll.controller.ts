import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto, UpdatePayrollDto, QueryPayrollDto } from './dto';
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

@Controller('companies/:companyId/payroll')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyPayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly exportService: ExportService,
  ) {}

  // ==================== Payroll Records ====================

  @Post()
  @RequireCreate('hr', 'payroll')
  create(@Param('companyId') companyId: string, @Body() dto: CreatePayrollDto) {
    return this.payrollService.create(companyId, dto);
  }

  @Get()
  @RequireView('hr', 'payroll')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryPayrollDto,
  ) {
    return this.payrollService.findAll(companyId, query);
  }

  @Get('summary')
  @RequireView('hr', 'payroll')
  getSummary(
    @Param('companyId') companyId: string,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.payrollService.getSummary(
      companyId,
      parseInt(year),
      month ? parseInt(month) : undefined,
    );
  }

  @Get('export')
  @RequireView('hr', 'payroll')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryPayrollDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.payrollService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);

    const columns = [
      { header: 'First Name', key: 'user.firstName', width: 20 },
      { header: 'Last Name', key: 'user.lastName', width: 20 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Month', key: 'month', width: 10 },
      { header: 'Gross Salary', key: 'grossSalary', width: 15 },
      { header: 'Net Salary', key: 'netSalary', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Payroll');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="payroll-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('hr', 'payroll')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.payrollService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('hr', 'payroll')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePayrollDto,
  ) {
    return this.payrollService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('hr', 'payroll')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.payrollService.remove(companyId, id);
  }

  // ==================== Workflow Actions ====================

  @Post(':id/approve')
  @RequireEdit('hr', 'payroll')
  approve(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.payrollService.approve(companyId, id, req.user.id);
  }

  @Post(':id/pay')
  @RequireEdit('hr', 'payroll')
  markAsPaid(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { paymentReference?: string },
  ) {
    return this.payrollService.markAsPaid(companyId, id, body.paymentReference);
  }

  @Post(':id/cancel')
  @RequireEdit('hr', 'payroll')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.payrollService.cancel(companyId, id);
  }

  // ==================== Bulk Operations ====================

  @Post('generate-bulk')
  @RequireCreate('hr', 'payroll')
  generateBulk(
    @Param('companyId') companyId: string,
    @Body() body: { year: number; month: number; defaultBaseSalary: number },
  ) {
    return this.payrollService.generateBulk(
      companyId,
      body.year,
      body.month,
      body.defaultBaseSalary,
    );
  }
}
