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
import { SitesService } from './sites.service';
import {
  CreateSiteDto,
  UpdateSiteDto,
  QuerySitesDto,
  QuerySiteSummaryDto,
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

@Controller('companies/:companyId/sites')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanySitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @RequireCreate('erp', 'sites')
  create(@Param('companyId') companyId: string, @Body() dto: CreateSiteDto) {
    return this.sitesService.create(companyId, dto);
  }

  @Get()
  @RequireView('erp', 'sites')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QuerySitesDto,
  ) {
    return this.sitesService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('erp', 'sites')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.sitesService.findOne(companyId, id);
  }

  // Продажби + разходи + резултат на обекта за период
  @Get(':id/summary')
  @RequireView('erp', 'sites')
  summary(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query() query: QuerySiteSummaryDto,
  ) {
    return this.sitesService.summary(companyId, id, query);
  }

  @Patch(':id')
  @RequireEdit('erp', 'sites')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
  ) {
    return this.sitesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('erp', 'sites')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.sitesService.remove(companyId, id);
  }
}
