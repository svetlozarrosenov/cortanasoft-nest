import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetaPixelController } from './meta-pixel.controller';
import { MetaPixelPublicController } from './meta-pixel-public.controller';
import { MetaPixelService } from './meta-pixel.service';
import { MetaPixelEventsService } from './meta-pixel-events.service';
import { MetaPixelInsightsService } from './meta-pixel-insights.service';

@Module({
  imports: [PrismaModule],
  controllers: [MetaPixelController, MetaPixelPublicController],
  providers: [MetaPixelService, MetaPixelEventsService, MetaPixelInsightsService],
  exports: [MetaPixelEventsService],
})
export class MetaPixelModule {}
