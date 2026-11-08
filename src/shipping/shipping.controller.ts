import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShipmentSyncService } from './shipment-sync.service';
import {
  CreateShipmentDto,
  CalculateShippingDto,
} from './dto/create-shipment.dto';
import { QueryShipmentsDto } from './dto/query-shipments.dto';
import { UpdateShippingAutomationDto } from './dto/update-shipping-automation.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CompanyAccessGuard } from '../common/guards/company-access.guard';
import {
  PermissionsGuard,
  RequireView,
  RequireEdit,
  RequireAnyPermission,
} from '../common/guards/permissions.guard';

// Пратките се виждат и управляват от две места: продажбата (erp.orders) и
// страницата ERP > Пратки (erp.shipments). Всяко от двете права стига.
const VIEW_ORDERS_OR_SHIPMENTS = RequireAnyPermission(
  { module: 'erp', page: 'orders', action: 'view' },
  { module: 'erp', page: 'shipments', action: 'view' },
);
const EDIT_ORDERS_OR_SHIPMENTS = RequireAnyPermission(
  { module: 'erp', page: 'orders', action: 'edit' },
  { module: 'erp', page: 'shipments', action: 'edit' },
);
// Автоматизацията е обща за куриерите → страницата на който и да е куриер
const VIEW_CARRIER_SETTINGS = RequireAnyPermission(
  { module: 'settings', page: 'econt', action: 'view' },
  { module: 'settings', page: 'speedy', action: 'view' },
  { module: 'settings', page: 'pigeon', action: 'view' },
  { module: 'erp', page: 'shipments', action: 'view' },
);
const EDIT_CARRIER_SETTINGS = RequireAnyPermission(
  { module: 'settings', page: 'econt', action: 'edit' },
  { module: 'settings', page: 'speedy', action: 'edit' },
  { module: 'settings', page: 'pigeon', action: 'edit' },
);

@Controller('companies/:companyId/shipping')
@UseGuards(JwtAuthGuard, CompanyAccessGuard, PermissionsGuard)
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly sync: ShipmentSyncService,
    private readonly prisma: PrismaService,
  ) {}

  /** Куриерите с активна конфигурация за фирмата. */
  @Get('providers')
  @VIEW_ORDERS_OR_SHIPMENTS
  providers(@Param('companyId') companyId: string) {
    return this.shippingService.enabledProviders(companyId);
  }

  /** Обновява статусите на всички отворени пратки (при отваряне на страницата / „Обнови"). */
  @Post('shipments/sync')
  @VIEW_ORDERS_OR_SHIPMENTS
  syncShipments(@Param('companyId') companyId: string) {
    return this.shippingService.syncShipments(companyId);
  }

  @Get('automation')
  @VIEW_CARRIER_SETTINGS
  getAutomation(@Param('companyId') companyId: string) {
    return this.sync.getAutomation(companyId);
  }

  @Patch('automation')
  @EDIT_CARRIER_SETTINGS
  updateAutomation(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateShippingAutomationDto,
  ) {
    return this.prisma.shippingAutomation.upsert({
      where: { companyId },
      update: dto,
      create: { companyId, ...dto },
    });
  }

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

  @Get('shipments')
  @RequireView('erp', 'shipments')
  findAll(
    @Param('companyId') companyId: string,
    @Query() query: QueryShipmentsDto,
  ) {
    return this.shippingService.findAll(companyId, query);
  }

  @Get('orders/:orderId/shipments')
  @VIEW_ORDERS_OR_SHIPMENTS
  getOrderShipments(
    @Param('companyId') companyId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.shippingService.getOrderShipments(companyId, orderId);
  }

  @Get('shipments/:shipmentId/track')
  @VIEW_ORDERS_OR_SHIPMENTS
  trackShipment(
    @Param('companyId') companyId: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.trackShipment(companyId, shipmentId);
  }

  @Post('shipments/:shipmentId/cancel')
  @EDIT_ORDERS_OR_SHIPMENTS
  cancelShipment(
    @Param('companyId') companyId: string,
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.shippingService.cancelShipment(companyId, shipmentId);
  }
}
