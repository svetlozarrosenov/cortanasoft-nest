import { Module } from '@nestjs/common';
import { SpeedyService } from './speedy.service';
import { SpeedyApiClient } from './speedy-api.client';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SpeedyService, SpeedyApiClient],
  exports: [SpeedyService],
})
export class SpeedyModule {}
