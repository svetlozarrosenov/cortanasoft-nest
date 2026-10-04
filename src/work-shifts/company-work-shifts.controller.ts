import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkShiftsService } from './work-shifts.service';
import {
  CopyWeekDto,
  CreateWorkShiftDto,
  QueryWorkShiftsDto,
  ScopeDto,
  UpdateWorkShiftDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireDelete,
  RequireEdit,
  RequireView,
} from '../common/guards/permissions.guard';

// Право: hr.schedule — не се дава автоматично на съществуващи роли.
@Controller('companies/:companyId/work-shifts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyWorkShiftsController {
  constructor(private shifts: WorkShiftsService) {}

  @Get()
  @RequireView('hr', 'schedule')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryWorkShiftsDto,
  ) {
    return this.shifts.findAll(companyId, query);
  }

  @Get('employees')
  @RequireView('hr', 'schedule')
  employees(@Param('companyId') companyId: string) {
    return this.shifts.employees(companyId);
  }

  @Get('sites')
  @RequireView('hr', 'schedule')
  sites(@Param('companyId') companyId: string) {
    return this.shifts.sites(companyId);
  }

  @Post()
  @RequireCreate('hr', 'schedule')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateWorkShiftDto,
  ) {
    return this.shifts.create(companyId, dto);
  }

  @Post('copy-week')
  @RequireCreate('hr', 'schedule')
  copyWeek(@Param('companyId') companyId: string, @Body() dto: CopyWeekDto) {
    return this.shifts.copyWeek(companyId, dto);
  }

  @Patch(':id')
  @RequireEdit('hr', 'schedule')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkShiftDto,
    @Query() scope: ScopeDto,
  ) {
    return this.shifts.update(companyId, id, dto, scope.scope);
  }

  @Delete(':id')
  @RequireDelete('hr', 'schedule')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query() scope: ScopeDto,
  ) {
    return this.shifts.remove(companyId, id, scope.scope);
  }
}
