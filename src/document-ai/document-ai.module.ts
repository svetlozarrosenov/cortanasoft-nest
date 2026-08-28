import { Module } from '@nestjs/common';
import { DocumentAIService } from './document-ai.service';
import { DocumentAIController } from './document-ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiSettingsModule } from '../ai-settings/ai-settings.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, AiSettingsModule, UploadsModule],
  controllers: [DocumentAIController],
  providers: [DocumentAIService],
  exports: [DocumentAIService],
})
export class DocumentAIModule {}
