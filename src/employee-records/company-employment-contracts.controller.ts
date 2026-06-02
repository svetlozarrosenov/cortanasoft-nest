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
  @RequireCreate('hr', 'employeeRecords')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateEmploymentContractDto,
  ) {
    return this.service.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('hr', 'employeeRecords')
  findAll(
    @Param('companyId') companyId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.findAll(companyId, userId);
  }

  @Get(':id')
  @RequireView('hr', 'employeeRecords')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('hr', 'employeeRecords')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentContractDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Post(':id/notify')
  @RequireEdit('hr', 'employeeRecords')
  notify(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.markNotified(companyId, id);
  }

  @Post(':id/confirm-delivery')
  @RequireEdit('hr', 'employeeRecords')
  confirmDelivery(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.confirmDelivery(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('hr', 'employeeRecords')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.remove(companyId, id);
  }
}
