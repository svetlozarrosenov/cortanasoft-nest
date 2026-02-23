import { Controller, Get, Param, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';

@Controller('companies/:companyId/employees')
@UseGuards(JwtAuthGuard, CompanyAccessGuard)
export class CompanyEmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  findAll(@Param('companyId') companyId: string) {
    return this.employeesService.findAll(companyId);
  }

  @Get('export')
  async export(
    @Param('companyId') companyId: string,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.employeesService.findAll(companyId);
    const data = (result as any).data || result;
    const columns = [
      { header: 'First Name', key: 'user.firstName', width: 20 },
      { header: 'Last Name', key: 'user.lastName', width: 20 },
      { header: 'Email', key: 'user.email', width: 25 },
      { header: 'Role', key: 'role.name', width: 20 },
      { header: 'Active', key: 'isActive', width: 10 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Employees');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.employeesService.findOne(companyId, id);
  }
}
