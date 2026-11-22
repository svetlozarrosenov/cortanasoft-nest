import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { FiscalDevicesService } from './fiscal-devices.service';
import { CompanyFiscalDevicesController } from './company-fiscal-devices.controller';
import { FiscalAgentController } from './fiscal-agent.controller';
import { FiscalDeviceGuard } from './fiscal-device.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CompanyFiscalDevicesController, FiscalAgentController],
  providers: [FiscalDevicesService, FiscalDeviceGuard],
  exports: [FiscalDevicesService, FiscalDeviceGuard],
})
export class FiscalDevicesModule {}
