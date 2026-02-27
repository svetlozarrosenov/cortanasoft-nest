import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SprintsService } from './sprints.service';
import {
  CreateSprintDto,
  UpdateSprintDto,
  ManageSprintTicketsDto,
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

@Controller('companies/:companyId/sprints')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanySprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post()
  @RequireCreate('tickets', 'sprints')
  create(
    @Param('companyId') companyId: string,
    @Request() req: any,
    @Body() dto: CreateSprintDto,
  ) {
    return this.sprintsService.create(companyId, req.user.id, dto);
  }

  @Get()
  @RequireView('tickets', 'sprints')
  findAll(@Param('companyId') companyId: string) {
    return this.sprintsService.findAll(companyId);
  }

  @Get(':id')
  @RequireView('tickets', 'sprints')
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.sprintsService.findOne(companyId, id);
  }

  @Get(':id/progress')
  @RequireView('tickets', 'sprints')
  getProgress(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.sprintsService.getProgress(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('tickets', 'sprints')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSprintDto,
  ) {
    return this.sprintsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('tickets', 'sprints')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.sprintsService.remove(companyId, id);
  }

  @Post(':id/tickets')
  @RequireEdit('tickets', 'sprints')
  addTickets(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ManageSprintTicketsDto,
  ) {
    return this.sprintsService.addTickets(companyId, id, dto);
  }

  @Delete(':id/tickets')
  @RequireEdit('tickets', 'sprints')
  removeTickets(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ManageSprintTicketsDto,
  ) {
    return this.sprintsService.removeTickets(companyId, id, dto);
  }

  @Post(':id/calculate-end-date')
  @RequireEdit('tickets', 'sprints')
  calculateEndDate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.sprintsService.calculateEndDate(id);
  }
}
