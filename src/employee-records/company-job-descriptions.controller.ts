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
import { JobDescriptionsService } from './job-descriptions.service';
import { CreateJobDescriptionDto, UpdateJobDescriptionDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireCreate,
  RequireDelete,
  RequireEdit,
  RequireView,
} from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/job-descriptions')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyJobDescriptionsController {
  constructor(private readonly service: JobDescriptionsService) {}

  @Post()
  @RequireCreate('employeeRecords', 'dossiers')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateJobDescriptionDto,
  ) {
    return this.service.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('employeeRecords', 'dossiers')
  findAll(
    @Param('companyId') companyId: string,
    @Query('position') position?: string,
  ) {
    return this.service.findAll(companyId, position);
  }

  @Get(':id')
  @RequireView('employeeRecords', 'dossiers')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('employeeRecords', 'dossiers')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobDescriptionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(companyId, id, dto, user.id);
  }

  @Delete(':id')
  @RequireDelete('employeeRecords', 'dossiers')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.remove(companyId, id, user.id);
  }
}
