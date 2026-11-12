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
import { SiteIssuesService } from './site-issues.service';
import {
  CreateSiteIssueDto,
  UpdateSiteIssueDto,
  QuerySiteIssuesDto,
  ReturnSiteIssueDto,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Изписване към обект. Цялата функционалност е зад warehouse.siteIssues —
// роля без правото не вижда нищо и получава 403.
@Controller('companies/:companyId/site-issues')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class CompanySiteIssuesController {
  constructor(private readonly siteIssuesService: SiteIssuesService) {}

  @Post()
  @RequireCreate('warehouse', 'siteIssues')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSiteIssueDto,
  ) {
    return this.siteIssuesService.create(companyId, user.id, dto);
  }

  @Get()
  @RequireView('warehouse', 'siteIssues')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QuerySiteIssuesDto,
  ) {
    return this.siteIssuesService.findAll(companyId, query);
  }

  // Активните обекти за падащото меню във формата — без да се изисква
  // отделно право за модул „Обекти"
  @Get('sites')
  @RequireView('warehouse', 'siteIssues')
  sites(@Param('companyId') companyId: string) {
    return this.siteIssuesService.siteOptions(companyId);
  }

  @Get('users')
  @RequireView('warehouse', 'siteIssues')
  users(@Param('companyId') companyId: string) {
    return this.siteIssuesService.userOptions(companyId);
  }

  // Материалите на един обект, сборувани по продукт
  @Get('site/:siteId/materials')
  @RequireView('warehouse', 'siteIssues')
  siteMaterials(
    @Param('companyId') companyId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.siteIssuesService.siteMaterials(companyId, siteId);
  }

  // Изписано и още непродадено — за автоматичното попълване на продажба
  @Get('site/:siteId/unsold')
  @RequireView('warehouse', 'siteIssues')
  unsold(
    @Param('companyId') companyId: string,
    @Param('siteId') siteId: string,
    @Query('excludeOrderId') excludeOrderId?: string,
  ) {
    return this.siteIssuesService.unsoldForSite(
      companyId,
      siteId,
      excludeOrderId,
    );
  }

  @Get(':id')
  @RequireView('warehouse', 'siteIssues')
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.siteIssuesService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequireEdit('warehouse', 'siteIssues')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSiteIssueDto,
  ) {
    return this.siteIssuesService.update(companyId, id, dto);
  }

  @Post(':id/issue')
  @RequireEdit('warehouse', 'siteIssues')
  issue(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.siteIssuesService.issue(companyId, id);
  }

  @Post(':id/return')
  @RequireEdit('warehouse', 'siteIssues')
  returnItems(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ReturnSiteIssueDto,
  ) {
    return this.siteIssuesService.returnItems(companyId, id, dto);
  }

  @Post(':id/cancel')
  @RequireEdit('warehouse', 'siteIssues')
  cancel(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.siteIssuesService.cancel(companyId, id);
  }

  @Delete(':id')
  @RequireDelete('warehouse', 'siteIssues')
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.siteIssuesService.remove(companyId, id);
  }
}
