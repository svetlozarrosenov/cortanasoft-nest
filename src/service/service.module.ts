import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AcceptanceProtocolsModule } from '../acceptance-protocols/acceptance-protocols.module';
import { AscertainmentProtocolsModule } from '../ascertainment-protocols/ascertainment-protocols.module';
import { ServiceNumberingService } from './service-numbering.service';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceAssetsService } from './service-assets.service';
import { ServiceContractsService } from './service-contracts.service';
import { ServiceProtocolsService } from './service-protocols.service';
import { ServiceInvoicingService } from './service-invoicing.service';
import { ServiceStockService } from './service-stock.service';
import { CompanyServiceOrdersController } from './company-service-orders.controller';
import { CompanyServiceAssetsController } from './company-service-assets.controller';
import { CompanyServiceContractsController } from './company-service-contracts.controller';
import { ServicePublicController } from './service-public.controller';
import { WarrantiesModule } from '../warranties/warranties.module';
import { ServiceSlaCronService } from './service-sla.cron';

@Module({
  imports: [
    PrismaModule,
    AcceptanceProtocolsModule,
    AscertainmentProtocolsModule,
    WarrantiesModule,
  ],
  controllers: [
    CompanyServiceOrdersController,
    CompanyServiceAssetsController,
    CompanyServiceContractsController,
    ServicePublicController,
  ],
  providers: [
    ServiceNumberingService,
    ServiceOrdersService,
    ServiceAssetsService,
    ServiceContractsService,
    ServiceProtocolsService,
    ServiceInvoicingService,
    ServiceStockService,
    ServiceSlaCronService,
  ],
  exports: [ServiceOrdersService, ServiceAssetsService, ServiceContractsService],
})
export class ServiceModule {}
