import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { WooCommerceWebhookService } from './woocommerce-webhook.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, WooCommerceWebhookService],
  exports: [WooCommerceWebhookService],
})
export class IntegrationsModule {}
