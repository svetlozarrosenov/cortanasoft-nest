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
import { ContractTemplatesService } from './contract-templates.service';
import {
  CreateContractTemplateDto,
  UpdateContractTemplateDto,
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

@Controller('companies/:companyId/contract-templates')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyContractTemplatesController {
  constructor(private readonly service: ContractTemplatesService) {}

  @Post()
  @RequireCreate('erp', 'contracts')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateContractTemplateDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @RequireView('erp', 'contracts')
  findAll(
    @Param('companyId') companyId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.findAll(companyId, activeOnly === 'true');
  }

  @Get(':id')
  @RequireView('erp', 'contracts')
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('erp', 'contracts')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContractTemplateDto,
  ) {
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('erp', 'contracts')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(companyId, id);
  }
}
