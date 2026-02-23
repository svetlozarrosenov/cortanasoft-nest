import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryService } from './inventory.service';
import { CompanyInventoryController } from './company-inventory.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyInventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
