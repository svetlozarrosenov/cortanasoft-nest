import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ServiceContractsService } from './service-contracts.service';
import {
  CreateServiceContractDto,
  UpdateServiceContractDto,
  QueryServiceContractsDto,
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

@Controller('companies/:companyId/service-contracts')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyServiceContractsController {
  constructor(private readonly contracts: ServiceContractsService) {}

  @Post()
  @RequireCreate('service', 'contracts')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateServiceContractDto,
  ) {
    return this.contracts.create(companyId, dto);
  }

  @Get()
  @RequireView('service', 'contracts')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryServiceContractsDto,
  ) {
    return this.contracts.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('service', 'contracts')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.contracts.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('service', 'contracts')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceContractDto,
  ) {
    return this.contracts.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('service', 'contracts')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.contracts.remove(companyId, id);
  }
}
