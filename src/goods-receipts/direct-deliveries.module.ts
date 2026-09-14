import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DirectDeliveriesService } from './direct-deliveries.service';

// Само Prisma: OrdersModule го ползва без да минава през GoodsReceiptsModule
// (който през WordPress/CloudCart сочи обратно към OrdersModule).
@Module({
  imports: [PrismaModule],
  providers: [DirectDeliveriesService],
  exports: [DirectDeliveriesService],
})
export class DirectDeliveriesModule {}
