import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { EcontProvider } from './econt.provider';
import { SpeedyProvider } from './speedy.provider';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController],
  providers: [ShippingService, EcontProvider, SpeedyProvider],
  exports: [ShippingService],
})
export class ShippingModule {}
