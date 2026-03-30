import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CompanyProductsController } from './company-products.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [ProductsController, CompanyProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
