import { Module } from '@nestjs/common';
import { SpeedyService } from './speedy.service';
import { SpeedyApiService } from './speedy-api.service';
import { SpeedyController } from './speedy.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpeedyController],
  providers: [SpeedyService, SpeedyApiService],
  exports: [SpeedyService],
})
export class SpeedyModule {}
