import { Module } from '@nestjs/common';
import { SitesService } from './sites.service';
import { CompanySitesController } from './company-sites.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HrSettingsModule } from '../hr-settings/hr-settings.module';

@Module({
  imports: [PrismaModule, HrSettingsModule],
  controllers: [CompanySitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
