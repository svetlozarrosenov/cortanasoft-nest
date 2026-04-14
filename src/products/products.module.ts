import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CompanyProductsController } from './company-products.controller';
import { WordPressModule } from '../wordpress/wordpress.module';
import { CloudCartModule } from '../cloudcart/cloudcart.module';

@Module({
  imports: [WordPressModule, CloudCartModule],
  controllers: [ProductsController, CompanyProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
