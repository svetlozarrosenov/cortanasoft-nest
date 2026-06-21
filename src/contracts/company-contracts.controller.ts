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
import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  QueryContractsDto,
  UpdateContractDto,
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

@Controller('companies/:companyId/contracts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyContractsController {
  constructor(private readonly service: ContractsService) {}

  @Post()
  @RequireCreate('erp', 'contracts')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateContractDto,
  ) {
    return this.service.create(companyId, dto);
  }

  @Get()
  @RequireView('erp', 'contracts')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryContractsDto,
  ) {
    return this.service.findAll(companyId, query);
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
    @Body() dto: UpdateContractDto,
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
