import { Module } from '@nestjs/common';
import { EcontService } from './econt.service';
import { EcontApiService } from './econt-api.service';
import { EcontController } from './econt.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EcontController],
  providers: [EcontService, EcontApiService],
  exports: [EcontService],
})
export class EcontModule {}
