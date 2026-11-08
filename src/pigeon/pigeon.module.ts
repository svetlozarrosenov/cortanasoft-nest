import { Module } from '@nestjs/common';
import { PigeonService } from './pigeon.service';
import { PigeonApiService } from './pigeon-api.service';
import { PigeonController } from './pigeon.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PigeonController],
  providers: [PigeonService, PigeonApiService],
  exports: [PigeonService],
})
export class PigeonModule {}
