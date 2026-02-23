import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { CompanySuppliersController } from './company-suppliers.controller';

@Module({
  controllers: [SuppliersController, CompanySuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
