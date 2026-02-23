import { Module } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { CompanyLeavesController } from './company-leaves.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyLeavesController],
  providers: [LeavesService],
  exports: [LeavesService],
})
export class LeavesModule {}
