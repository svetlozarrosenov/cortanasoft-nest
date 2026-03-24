import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
} from '../common/guards/permissions.guard';

@Controller('companies/:companyId/shipping')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // ==================== Config ====================

  @Get('config')
  @RequireView('erp', 'orders')
  getConfig(@Param('companyId') companyId: string) {
    return this.shippingService.getConfig(companyId);
  }

  @Patch('config')
  @RequireEdit('erp', 'orders')
  updateConfig(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateShippingConfigDto,
  ) {
    return this.shippingService.updateConfig(companyId, dto);
  }

  @Post('test-connection')
  @RequireEdit('erp', 'orders')
  testConnection(@Param('companyId') companyId: string) {
    return this.shippingService.testConnection(companyId);
  }

  @Get('offices')
  @RequireView('erp', 'orders')
  getOffices(@Param('companyId') companyId: string) {
    return this.shippingService.getOffices(companyId);
  }

  @Get('client-profiles')
  @RequireView('erp', 'orders')
  getClientProfiles(@Param('companyId') companyId: string) {
    return this.shippingService.getClientProfiles(companyId);
  }

  // ==================== Shipments ====================

  @Post('calculate')
  @RequireView('erp', 'orders')
  calculate(
    @Param('companyId') companyId: string,
    @Body() dto: CalculateShippingDto,
  ) {
    return this.shippingService.calculateShipping(companyId, dto);
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
