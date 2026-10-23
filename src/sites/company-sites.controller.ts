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
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  @RequireCreate('sites', 'sites')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSiteDto,
  ) {
    return this.sitesService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('sites', 'sites')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QuerySitesDto,
  ) {
    return this.sitesService.findAll(companyId, query);
  }

  @Get(':id')
  @RequireView('sites', 'sites')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.sitesService.findOne(companyId, id);
  }

  // Продажби + разходи + резултат на обекта за период
  @Get(':id/summary')
  @RequireView('sites', 'sites')
  summary(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query() query: QuerySiteSummaryDto,
  ) {
    return this.sitesService.summary(companyId, id, query);
  }

  @Patch(':id')
  @RequireEdit('sites', 'sites')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
  ) {
    return this.sitesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @RequireDelete('sites', 'sites')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.sitesService.remove(companyId, id);
  }
}
