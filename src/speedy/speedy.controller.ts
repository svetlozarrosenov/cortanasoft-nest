import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SpeedyService } from './speedy.service';
import { UpdateSpeedyConfigDto } from './dto/update-speedy-config.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireEdit,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/shipping/speedy')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class SpeedyController {
  constructor(private readonly speedyService: SpeedyService) {}

  @Get('config')
  @RequireAnyPermission(
    { module: 'settings', page: 'speedy', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getConfig(@Param('companyId') companyId: string) {
    return this.speedyService.getConfig(companyId);
  }

  @Patch('config')
  @RequireEdit('settings', 'speedy')
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateSpeedyConfigDto,
  ) {
    return this.speedyService.updateConfig(companyId, dto);
  }

  @Post('test-connection')
  @RequireEdit('settings', 'speedy')
  testConnection(@Param('companyId') companyId: string) {
    return this.speedyService.testConnection(companyId);
  }

  @Get('offices')
  @RequireAnyPermission(
    { module: 'settings', page: 'speedy', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getOffices(
    @Param('companyId') companyId: string,
    @Query('siteId') siteId?: string,
    @Query('name') name?: string,
  ) {
    return this.speedyService.getOffices(
      companyId,
      siteId ? parseInt(siteId) : undefined,
      name,
    );
  }

  @Get('sites')
  @RequireAnyPermission(
    { module: 'settings', page: 'speedy', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSites(
    @Param('companyId') companyId: string,
    @Query('name') name?: string,
    @Query('postCode') postCode?: string,
  ) {
    return this.speedyService.getSites(companyId, name, postCode);
  }

  @Get('sites/:siteId')
  @RequireAnyPermission(
    { module: 'settings', page: 'speedy', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSiteById(
    @Param('companyId') companyId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.speedyService.getSiteById(companyId, parseInt(siteId));
  }

  @Get('offices/:officeId')
  @RequireAnyPermission(
    { module: 'settings', page: 'speedy', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getOfficeById(
    @Param('companyId') companyId: string,
    @Param('officeId') officeId: string,
  ) {
    return this.speedyService.getOfficeById(companyId, parseInt(officeId));
  }

  @Get('countries')
  @RequireAnyPermission(
    { module: 'settings', page: 'speedy', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getCountries(@Param('companyId') companyId: string) {
    return this.speedyService.getCountries(companyId);
  }

  @Get('services')
  @RequireAnyPermission(
    { module: 'settings', page: 'speedy', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getServices(@Param('companyId') companyId: string) {
    return this.speedyService.getServices(companyId);
  }

  @Get('client-info')
  @RequireAnyPermission(
    { module: 'settings', page: 'speedy', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getClientInfo(@Param('companyId') companyId: string) {
    return this.speedyService.getClientInfo(companyId);
  }

  @Get('shipments/:shipmentId/label')
  @RequireView('erp', 'orders')
  getLabel(
    @Param('companyId') companyId: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.speedyService.getLabelByShipmentId(companyId, shipmentId);
  }
}
