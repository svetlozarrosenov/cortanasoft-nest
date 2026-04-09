import { Module } from '@nestjs/common';
import { EcontService } from './econt.service';
import { EcontApiClient } from './econt-api.client';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EcontService, EcontApiClient],
  exports: [EcontService],
})
export class EcontModule {}
