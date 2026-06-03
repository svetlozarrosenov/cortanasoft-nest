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
import { EmploymentAnnexesService } from './employment-annexes.service';
import { CreateEmploymentAnnexDto, UpdateEmploymentAnnexDto } from './dto';
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

@Controller('companies/:companyId/employment-annexes')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyEmploymentAnnexesController {
  constructor(private readonly service: EmploymentAnnexesService) {}

  @Post()
  @RequireCreate('hr', 'employeeRecords')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateEmploymentAnnexDto,
  ) {
    return this.service.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('hr', 'employeeRecords')
  findAll(
    @Param('companyId') companyId: string,
    @Query('contractId') contractId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.findAll(companyId, { contractId, userId });
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
    @Body() dto: UpdateEmploymentAnnexDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('hr', 'employeeRecords')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.service.remove(companyId, id);
  }
}
