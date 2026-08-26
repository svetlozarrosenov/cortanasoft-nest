import { Module } from '@nestjs/common';
import { SitesService } from './sites.service';
import { CompanySitesController } from './company-sites.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanySitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
