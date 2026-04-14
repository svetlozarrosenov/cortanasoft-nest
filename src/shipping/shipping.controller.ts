import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import {
  CreateShipmentDto,
  CalculateShippingDto,
} from './dto/create-shipment.dto';
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

  @Post('calculate')
  @RequireView('erp', 'orders')
  calculate(
    @Param('companyId') companyId: string,
    @Body() dto: CalculateShippingDto,
  ) {
    return this.shippingService.calculateShipping(companyId, dto.provider, dto);
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
