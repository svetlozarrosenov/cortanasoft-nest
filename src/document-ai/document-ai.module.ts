import { Module } from '@nestjs/common';
import { DocumentAIService } from './document-ai.service';
import { DocumentAIController } from './document-ai.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentAIController],
  providers: [DocumentAIService],
  exports: [DocumentAIService],
})
export class DocumentAIModule {}
