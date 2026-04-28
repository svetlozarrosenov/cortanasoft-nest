import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MetaPixelController } from './meta-pixel.controller';
import { MetaPixelPublicController } from './meta-pixel-public.controller';
import { MetaPixelService } from './meta-pixel.service';

@Module({
  imports: [PrismaModule],
  controllers: [MetaPixelController, MetaPixelPublicController],
  providers: [MetaPixelService],
})
export class MetaPixelModule {}
