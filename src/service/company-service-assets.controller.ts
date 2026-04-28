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
import { ServiceAssetsService } from './service-assets.service';
import {
  CreateServiceAssetDto,
  UpdateServiceAssetDto,
  QueryServiceAssetsDto,
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

@Controller('companies/:companyId/service-assets')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanyServiceAssetsController {
  constructor(private readonly assets: ServiceAssetsService) {}

  @Post()
  @RequireCreate('service', 'assets')
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateServiceAssetDto,
  ) {
    return this.assets.create(companyId, dto);
  }

  @Get()
  @RequireView('service', 'assets')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryServiceAssetsDto,
  ) {
    return this.assets.findAll(companyId, query);
  }

  @Get('lookup')
  @RequireView('service', 'assets')
  lookupBySerial(
    @Param('companyId') companyId: string,
    @Query('serial') serial: string,
  ) {
    return this.assets.lookupBySerial(companyId, serial);
  }

  @Get(':id')
  @RequireView('service', 'assets')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.assets.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('service', 'assets')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceAssetDto,
  ) {
    return this.assets.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('service', 'assets')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.assets.remove(companyId, id);
  }
}
