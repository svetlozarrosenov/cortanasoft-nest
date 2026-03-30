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
  @RequireView('settings', 'shipping')
  getConfig(@Param('companyId') companyId: string) {
    return this.shippingService.getConfig(companyId, 'econt');
  }

  @Patch('config')
  @RequireEdit('settings', 'shipping')
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateShippingConfigDto,
  ) {
    return this.shippingService.updateConfig(companyId, 'econt', dto);
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
  @RequireView('settings', 'shipping')
  getClientProfiles(@Param('companyId') companyId: string) {
    return this.shippingService.getEcontClientProfiles(companyId);
  }

  // ==================== Speedy Config ====================

  @Get('speedy/config')
  @RequireView('settings', 'shipping')
  getSpeedyConfig(@Param('companyId') companyId: string) {
    return this.shippingService.getConfig(companyId, 'speedy');
  }

  @Patch('speedy/config')
  @RequireEdit('settings', 'shipping')
  updateSpeedyConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateShippingConfigDto,
  ) {
    return this.shippingService.updateConfig(companyId, 'speedy', dto);
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

  @Get('speedy/services')
  @RequireView('settings', 'shipping')
  getSpeedyServices(@Param('companyId') companyId: string) {
    return this.shippingService.getSpeedyServices(companyId);
  }

  @Get('speedy/client-info')
  @RequireView('settings', 'shipping')
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
