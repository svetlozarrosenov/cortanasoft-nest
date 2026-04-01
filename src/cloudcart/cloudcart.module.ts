import { Module } from '@nestjs/common';
import { CloudCartController } from './cloudcart.controller';
import { CloudCartWebhookController } from './cloudcart-webhook.controller';
import { CloudCartService } from './cloudcart.service';
import { CloudCartApiService } from './cloudcart-api.service';
import { CloudCartWebhookService } from './cloudcart-webhook.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, OrdersModule],
  controllers: [CloudCartController, CloudCartWebhookController],
  providers: [CloudCartService, CloudCartApiService, CloudCartWebhookService],
  exports: [CloudCartService, CloudCartApiService],
})
export class CloudCartModule {}
