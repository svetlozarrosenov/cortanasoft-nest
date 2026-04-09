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
import { ShippingService } from './shipping.service';
import { UpdateShippingConfigDto } from './dto/shipping-config.dto';
import { CreateShipmentDto, CalculateShippingDto } from './dto/create-shipment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireEdit,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/shipping')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ==================== Econt Config ====================

  @Get('config')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getConfig(@Param('companyId') companyId: string) {
    return this.shippingService.getEcontConfig(companyId);
  }

  @Patch('config')
  @RequireEdit('settings', 'shipping')
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateShippingConfigDto,
  ) {
    return this.shippingService.updateEcontConfig(companyId, dto);
  }

  @Post('test-connection')
  @RequireEdit('settings', 'shipping')
  testConnection(@Param('companyId') companyId: string) {
    return this.shippingService.testConnection(companyId, 'econt');
  }

  @Get('offices')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getOffices(@Param('companyId') companyId: string) {
    return this.shippingService.getEcontOffices(companyId);
  }

  @Get('client-profiles')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getClientProfiles(@Param('companyId') companyId: string) {
    return this.shippingService.getEcontClientProfiles(companyId);
  }

  // ==================== Speedy Config ====================

  @Get('speedy/config')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSpeedyConfig(@Param('companyId') companyId: string) {
    return this.shippingService.getSpeedyConfig(companyId);
  }

  @Patch('speedy/config')
  @RequireEdit('settings', 'shipping')
  updateSpeedyConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateShippingConfigDto,
  ) {
    return this.shippingService.updateSpeedyConfig(companyId, dto);
  }

  @Post('speedy/test-connection')
  @RequireEdit('settings', 'shipping')
  testSpeedyConnection(@Param('companyId') companyId: string) {
    return this.shippingService.testConnection(companyId, 'speedy');
  }

  @Get('speedy/offices')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSpeedyOffices(
    @Param('companyId') companyId: string,
    @Query('siteId') siteId?: string,
    @Query('name') name?: string,
  ) {
    return this.shippingService.getSpeedyOffices(
      companyId,
      siteId ? parseInt(siteId) : undefined,
      name,
    );
  }

  @Get('speedy/sites')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSpeedySites(
    @Param('companyId') companyId: string,
    @Query('name') name?: string,
    @Query('postCode') postCode?: string,
  ) {
    return this.shippingService.getSpeedySites(companyId, name, postCode);
  }

  @Get('speedy/sites/:siteId')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSpeedySiteById(
    @Param('companyId') companyId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.shippingService.getSpeedySiteById(companyId, parseInt(siteId));
  }

  @Get('speedy/offices/:officeId')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSpeedyOfficeById(
    @Param('companyId') companyId: string,
    @Param('officeId') officeId: string,
  ) {
    return this.shippingService.getSpeedyOfficeById(
      companyId,
      parseInt(officeId),
    );
  }

  @Get('speedy/countries')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSpeedyCountries(@Param('companyId') companyId: string) {
    return this.shippingService.getSpeedyCountries(companyId);
  }

  @Get('speedy/services')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSpeedyServices(@Param('companyId') companyId: string) {
    return this.shippingService.getSpeedyServices(companyId);
  }

  @Get('speedy/client-info')
  @RequireAnyPermission(
    { module: 'settings', page: 'shipping', action: 'view' },
    { module: 'erp', page: 'orders', action: 'view' },
  )
  getSpeedyClientInfo(@Param('companyId') companyId: string) {
    return this.shippingService.getSpeedyClientInfo(companyId);
  }

  @Post('speedy/calculate')
  @RequireView('erp', 'orders')
  calculateSpeedy(
    @Param('companyId') companyId: string,
    @Body() dto: CalculateShippingDto,
  ) {
    return this.shippingService.calculateShipping(companyId, 'speedy', dto);
  }

  @Get('speedy/shipments/:shipmentId/label')
  @RequireView('erp', 'orders')
  getSpeedyLabel(
    @Param('companyId') companyId: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.getSpeedyLabel(companyId, shipmentId);
  }

  // ==================== Common Shipments ====================

  @Post('calculate')
  @RequireView('erp', 'orders')
  calculate(
    @Param('companyId') companyId: string,
    @Body() dto: CalculateShippingDto,
  ) {
    return this.shippingService.calculateShipping(companyId, 'econt', dto);
  }

  @Post('shipments')
  @RequireEdit('erp', 'orders')
  createShipment(
    @Param('companyId') companyId: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shippingService.createShipment(companyId, dto);
  }

  @Get('orders/:orderId/shipments')
  @RequireView('erp', 'orders')
  getOrderShipments(
    @Param('companyId') companyId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.shippingService.getOrderShipments(companyId, orderId);
  }

  @Get('shipments/:shipmentId/track')
  @RequireView('erp', 'orders')
  trackShipment(
    @Param('companyId') companyId: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.trackShipment(companyId, shipmentId);
  }

  @Post('shipments/:shipmentId/cancel')
  @RequireEdit('erp', 'orders')
  cancelShipment(
    @Param('companyId') companyId: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.cancelShipment(companyId, shipmentId);
  }
}
