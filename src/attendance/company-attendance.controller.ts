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
  CheckInDto,
  BulkUpdateAttendanceDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireCreate,
  RequireEdit,
  RequireDelete,
  RequireAnyPermission,
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

  // ==================== „Моите присъствия" ====================
  // Работник с право само hr.myAttendance: собствените записи + Вход/Изход.
  // Общите ендпойнти (today, check-in/out) приемат и двете права.

  @Get('my')
  @RequireAnyPermission(
    { module: 'hr', page: 'attendance', action: 'view' },
    { module: 'hr', page: 'myAttendance', action: 'view' },
  )
  findMine(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.attendanceService.findAll(companyId, {
      ...query,
      userId: req.user.id,
    });
  }

  // Активни обекти за избор при Вход / ръчен запис — без да се изисква
  // право за модул Обекти
  @Get('site-options')
  @RequireAnyPermission(
    { module: 'hr', page: 'attendance', action: 'view' },
    { module: 'hr', page: 'myAttendance', action: 'view' },
  )
  siteOptions(@Param('companyId') companyId: string) {
    return this.attendanceService.findSiteOptions(companyId);
  }

  // Месечна матрица „служители × дни" — основният изглед на страницата
  @Get('month')
  @RequireView('hr', 'attendance')
  getMonthOverview(
    @Param('companyId') companyId: string,
    @Query('month') month: string,
    @Query('userId') userId?: string,
    @Query('siteId') siteId?: string,
    @Query('today') today?: string,
  ) {
    return this.attendanceService.getMonthOverview(
      companyId,
      month,
      userId || undefined,
      siteId || undefined,
      today || undefined,
    );
  }

  @Get('today')
  @RequireAnyPermission(
    { module: 'hr', page: 'attendance', action: 'view' },
    { module: 'hr', page: 'myAttendance', action: 'view' },
  )
  getTodayStatus(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getTodayStatus(companyId, req.user.id, date);
  }

  // Отворени интервали (кой е „вътре" в момента), групирани по обект в UI-а.
  // Гейтнато и с права за Обекти — дъската живее в Обекти > списък.
  @Get('live')
  @RequireAnyPermission(
    { module: 'hr', page: 'attendance', action: 'view' },
    { module: 'sites', page: 'sites', action: 'view' },
  )
  live(@Param('companyId') companyId: string, @Query('date') date?: string) {
    return this.attendanceService.findOpenIntervals(companyId, date);
  }

  // Календарна информация за чиповете в „от–до" формата: работен ден /
  // одобрен отпуск per дата. Преди :id, за да не го прихване.
  @Get('day-info')
  @RequireView('hr', 'attendance')
  getDayInfo(
    @Param('companyId') companyId: string,
    @Query('userId') userId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Request() req: any,
  ) {
    return this.attendanceService.getDayInfo(
      companyId,
      userId || req.user.id,
      dateFrom,
      dateTo,
    );
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
      { header: 'Site', key: 'site.name', width: 24 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Check In', key: 'checkIn', width: 20 },
      { header: 'Check Out', key: 'checkOut', width: 20 },
      { header: 'Worked Minutes', key: 'workedMinutes', width: 15 },
      { header: 'Overtime Minutes', key: 'overtimeMinutes', width: 15 },
    ];
    const buffer = await this.exportService.generateFile(columns, data, format, 'Attendance');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    res.set({
      'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="attendance-${new Date().toISOString().slice(0, 10)}.${ext}"`,
    });
    return new StreamableFile(buffer);
  }

  // Масова редакция (обект) — преди ':id', за да не го засенчи
  @Patch('bulk')
  @RequireEdit('hr', 'attendance')
  bulkUpdate(
    @Param('companyId') companyId: string,
    @Body() dto: BulkUpdateAttendanceDto,
  ) {
    return this.attendanceService.bulkUpdate(companyId, dto);
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
  @RequireAnyPermission(
    { module: 'hr', page: 'attendance', action: 'create' },
    { module: 'hr', page: 'myAttendance', action: 'view' },
  )
  checkIn(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkIn(
      companyId,
      req.user.id,
      dto?.siteId,
      dto?.date,
    );
  }

  @Post('check-out')
  @RequireAnyPermission(
    { module: 'hr', page: 'attendance', action: 'edit' },
    { module: 'hr', page: 'myAttendance', action: 'view' },
  )
  checkOut(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() dto: CheckInDto,
  ) {
    return this.attendanceService.checkOut(companyId, req.user.id, dto?.date);
  }
}
