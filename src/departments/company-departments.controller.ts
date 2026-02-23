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
} from '@nestjs/common';
import type { Response } from 'express';
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  AddMemberDto,
  UpdateMemberDto,
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
import { ExportService } from '../common/export/export.service';
import type { ExportFormat } from '../common/export/export.service';

@Controller('companies/:companyId/departments')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyDepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly exportService: ExportService,
  ) {}

  // ==================== Departments ====================

  @Post()
  @RequireCreate('hr', 'departments')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(companyId, dto);
  }

  @Get()
  @RequireView('hr', 'departments')
  findAll(@Param('companyId') companyId: string) {
    return this.departmentsService.findAll(companyId);
  }

  @Get('export')
  @RequireView('hr', 'departments')
  async export(
    @Param('companyId') companyId: string,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.departmentsService.findAll(companyId);

    const columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Code', key: 'code', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Manager First Name', key: 'manager.firstName', width: 20 },
      { header: 'Manager Last Name', key: 'manager.lastName', width: 20 },
      { header: 'Members', key: '_count.members', width: 12 },
      { header: 'Active', key: 'isActive', width: 10 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Departments');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="departments-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('hr', 'departments')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.departmentsService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('hr', 'departments')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('hr', 'departments')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.departmentsService.remove(companyId, id);
  }

  // ==================== Department Members ====================

  @Get(':id/available-employees')
  @RequireView('hr', 'departments')
  getAvailableEmployees(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.departmentsService.getAvailableEmployees(companyId, id);
  }

  @Post(':id/members')
  @RequireEdit('hr', 'departments')
  addMember(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.departmentsService.addMember(companyId, id, dto);
  }

  @Patch(':id/members/:userId')
  @RequireEdit('hr', 'departments')
  updateMember(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.departmentsService.updateMember(companyId, id, userId, dto);
  }

  @Delete(':id/members/:userId')
  @RequireEdit('hr', 'departments')
  removeMember(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.departmentsService.removeMember(companyId, id, userId);
  }
}
