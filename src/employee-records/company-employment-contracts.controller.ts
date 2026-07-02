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
import { EmploymentContractsService } from './employment-contracts.service';
import {
  CreateEmploymentContractDto,
  UpdateEmploymentContractDto,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('companies/:companyId/employment-contracts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyEmploymentContractsController {
  constructor(private readonly service: EmploymentContractsService) {}

  @Post()
  @RequireCreate('employeeRecords', 'dossiers')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateEmploymentContractDto,
  ) {
    return this.service.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('employeeRecords', 'dossiers')
  findAll(
    @Param('companyId') companyId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.findAll(companyId, userId);
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
    @Body() dto: UpdateEmploymentContractDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(companyId, id, dto, user.id);
  }

  // notify / confirm-delivery минават през генеричните endpoint-и
  // (company-employee-record-notifications.controller.ts), които реално
  // известяват служителя и пишат одит следа.

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
