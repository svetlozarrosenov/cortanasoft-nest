import { Module } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import { CompanyAiSettingsController } from './company-ai-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyAiSettingsController],
  providers: [AiSettingsService],
  exports: [AiSettingsService],
})
export class AiSettingsModule {}
