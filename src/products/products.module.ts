import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CompanyProductsController } from './company-products.controller';
import { IntegrationsModule } from '../integrations/integrations.module';
import { CloudCartModule } from '../cloudcart/cloudcart.module';

@Module({
  imports: [IntegrationsModule, CloudCartModule],
  controllers: [ProductsController, CompanyProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
