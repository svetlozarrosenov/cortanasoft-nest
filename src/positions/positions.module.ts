import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { CompanyPositionsController } from './company-positions.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyPositionsController],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}
