import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { ShippingProviderRegistry } from './shipping-provider.registry';
import { ShipmentSyncService } from './shipment-sync.service';
import { ShippingSyncCron } from './shipping-sync.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { EcontModule } from '../econt/econt.module';
import { SpeedyModule } from '../speedy/speedy.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';

// Куриерските модули се импортират само за да се инстанцират сервизите им;
// ShippingService/ShipmentSyncService ги намират през ShippingProviderRegistry
// (@ShippingCarrier), не по име. Нов куриер = нов модул тук + в AppModule.
@Module({
  imports: [
    PrismaModule,
    DiscoveryModule,
    EcontModule,
    SpeedyModule,
    WebhooksModule,
    OrdersModule,
    PaymentsModule,
  ],
  controllers: [ShippingController],
  providers: [
    ShippingProviderRegistry,
    ShipmentSyncService,
    ShippingSyncCron,
    ShippingService,
  ],
  exports: [ShippingService, ShipmentSyncService, ShippingProviderRegistry],
})
export class ShippingModule {}
