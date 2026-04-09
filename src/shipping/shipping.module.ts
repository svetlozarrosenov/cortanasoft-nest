import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EcontModule } from '../econt/econt.module';
import { SpeedyModule } from '../speedy/speedy.module';

@Module({
  imports: [PrismaModule, EcontModule, SpeedyModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
