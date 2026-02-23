import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CompanyProductsController } from './company-products.controller';

@Module({
  controllers: [ProductsController, CompanyProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
