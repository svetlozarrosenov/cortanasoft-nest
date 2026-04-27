import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsGoogleController } from './analytics-google.controller';
import { AnalyticsGooglePublicController } from './analytics-google-public.controller';
import { AnalyticsGoogleService } from './analytics-google.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsGoogleController, AnalyticsGooglePublicController],
  providers: [AnalyticsGoogleService],
})
export class AnalyticsGoogleModule {}
