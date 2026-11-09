import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AcceptanceProtocolsModule } from '../acceptance-protocols/acceptance-protocols.module';
import { AscertainmentProtocolsModule } from '../ascertainment-protocols/ascertainment-protocols.module';
import { ServiceNumberingService } from './service-numbering.service';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceAssetsService } from './service-assets.service';
import { ServiceProtocolsService } from './service-protocols.service';
import { ServiceStockService } from './service-stock.service';
import { CompanyServiceOrdersController } from './company-service-orders.controller';
import { CompanyServiceAssetsController } from './company-service-assets.controller';
import { WarrantiesModule } from '../warranties/warranties.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    PrismaModule,
    AcceptanceProtocolsModule,
    AscertainmentProtocolsModule,
    WarrantiesModule,
    UploadsModule,
  ],
  controllers: [CompanyServiceOrdersController, CompanyServiceAssetsController],
  providers: [
    ServiceNumberingService,
    ServiceOrdersService,
    ServiceAssetsService,
    ServiceProtocolsService,
    ServiceStockService,
  ],
  exports: [ServiceOrdersService, ServiceAssetsService],
})
export class ServiceModule {}
