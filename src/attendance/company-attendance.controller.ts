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
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceDto,
  UpdateAttendanceDto,
  QueryAttendanceDto,
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

@Controller('companies/:companyId/attendance')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyAttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly exportService: ExportService,
  ) {}

  // ==================== Attendance Records ====================

  @Post()
  @RequireCreate('hr', 'attendance')
  create(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() dto: CreateAttendanceDto,
  ) {
    return this.attendanceService.create(companyId, req.user.id, dto);
  }

  @Get()
  @RequireView('hr', 'attendance')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.attendanceService.findAll(companyId, query);
  }

  @Get('today')
  @RequireView('hr', 'attendance')
  getTodayStatus(@Param('companyId') companyId: string, @Request() req: any) {
    return this.attendanceService.getTodayStatus(companyId, req.user.id);
  }

  @Get('summary')
  @RequireView('hr', 'attendance')
  getSummary(
    @Param('companyId') companyId: string,
    @Query('userId') userId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.attendanceService.getSummary(
      companyId,
      userId,
      dateFrom,
      dateTo,
    );
  }

  @Get('export')
  @RequireView('hr', 'attendance')
  async export(
    @Param('companyId') companyId: string,
    @Query() query: QueryAttendanceDto,
    @Query('format') format: ExportFormat = 'xlsx',
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data } = await this.attendanceService.findAll(companyId, { ...query, page: 1, limit: 100000 } as any);
    const columns = [
      { header: 'First Name', key: 'user.firstName', width: 20 },
      { header: 'Last Name', key: 'user.lastName', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Check In', key: 'checkIn', width: 20 },
      { header: 'Check Out', key: 'checkOut', width: 20 },
      { header: 'Worked Minutes', key: 'workedMinutes', width: 15 },
      { header: 'Overtime Minutes', key: 'overtimeMinutes', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Attendance');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="attendance-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @RequireView('hr', 'attendance')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.attendanceService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('hr', 'attendance')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('hr', 'attendance')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.attendanceService.remove(companyId, id);
  }

  // ==================== Check In/Out ====================

  @Post('check-in')
  @RequireCreate('hr', 'attendance')
  checkIn(@Param('companyId') companyId: string, @Request() req: any) {
    return this.attendanceService.checkIn(companyId, req.user.id);
  }

  @Post('check-out')
  @RequireEdit('hr', 'attendance')
  checkOut(@Param('companyId') companyId: string, @Request() req: any) {
    return this.attendanceService.checkOut(companyId, req.user.id);
  }

  // ==================== Approval ====================

  @Post(':id/approve')
  @RequireEdit('hr', 'attendance')
  approve(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.attendanceService.approve(companyId, id, req.user.id);
  }

  @Post(':id/reject')
  @RequireEdit('hr', 'attendance')
  reject(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.attendanceService.reject(companyId, id, req.user.id);
  }
}
